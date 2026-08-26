'use strict';

const fs = require('fs/promises');
const path = require('path');
const { callOpenAI } = require('../../integrations/openai.client');
const { documentAnalysisSchema } = require('./document.schema');
const { DOCUMENT_SYSTEM_PROMPT, buildDocumentUserPrompt } = require('./document.prompt');

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const MAX_EXTRACTED_TEXT = 12000;

function emptyEntities() {
  return { contractor: null, project: null, amount: null, date: null };
}

function buildMockDocumentResponse(input, extractedText) {
  const name = String(input.originalName || '').toLowerCase();
  const text = String(extractedText || '').trim();
  const selfie = /selfie|portrait|avatar|profile/.test(name);
  const likelyDocument = /pdf|notice|order|bill|receipt|work|letter|certificate|photo|image/.test(name) || text.length > 20;
  const relevant = !selfie && likelyDocument;
  return {
    documentId: String(input.documentId),
    documentType: selfie ? 'Personal Image' : input.mimeType === 'application/pdf' ? 'PDF Document' : 'Image / Photograph',
    language: /[\u0900-\u097F]/.test(text) ? 'hi' : text ? 'en' : 'unknown',
    isRelevant: relevant,
    relevanceScore: relevant ? 0.82 : 0.08,
    supportsComplaint: relevant && text.length > 0,
    supportingClaims: relevant && text.length > 0 ? ['Document contains content that may be relevant to the submitted complaint.'] : [],
    extractedText: text,
    detectedEntities: emptyEntities(),
    flags: selfie ? ['Personal image may not support the grievance.'] : [],
    confidence: relevant ? 0.72 : 0.9,
  };
}

async function extractPdfText(filePath) {
  const buffer = await fs.readFile(filePath);
  // Keep the dependency optional so offline/test installations remain usable.
  try {
    // pdf-parse v1 is CommonJS and performs actual layout-aware extraction.
    const pdfParse = require('pdf-parse');
    const result = await pdfParse(buffer);
    return String(result.text || '').slice(0, MAX_EXTRACTED_TEXT);
  } catch (error) {
    // Keep a bounded fallback for malformed/scanned PDFs. The model can still
    // inspect an image representation in a future OCR adapter, while malformed
    // input never brings down the whole grievance pipeline.
    if (error.code !== 'MODULE_NOT_FOUND') {
      console.warn(`[DocumentAgent] PDF parser fallback: ${error.message}`);
    }
    return buffer.toString('utf8').replace(/[^\x09\x0A\x0D\x20-\x7E\u0900-\u097F]/g, ' ').slice(0, MAX_EXTRACTED_TEXT).trim();
  }
}

async function readDocumentContent(input) {
  if (!input.filePath) return { extractedText: '', imageDataUrl: null };
  if (input.mimeType === 'application/pdf') {
    return { extractedText: await extractPdfText(input.filePath), imageDataUrl: null };
  }
  if (IMAGE_TYPES.has(input.mimeType)) {
    const buffer = await fs.readFile(input.filePath);
    return { extractedText: '', imageDataUrl: `data:${input.mimeType};base64,${buffer.toString('base64')}` };
  }
  throw new Error(`Unsupported document type: ${input.mimeType}`);
}

async function runDocumentAgent(input) {
  const content = await readDocumentContent(input);
  const mockResponse = buildMockDocumentResponse(input, content.extractedText);
  const userPrompt = buildDocumentUserPrompt({ ...input, extractedText: content.extractedText });
  const user = content.imageDataUrl
    ? [
        { type: 'text', text: userPrompt },
        { type: 'image_url', image_url: { url: content.imageDataUrl, detail: 'high' } },
      ]
    : userPrompt;

  return callOpenAI({
    tier: 'fast',
    system: DOCUMENT_SYSTEM_PROMPT,
    user,
    schema: documentAnalysisSchema,
    mockResponse,
  });
}

module.exports = {
  IMAGE_TYPES,
  buildMockDocumentResponse,
  extractPdfText,
  readDocumentContent,
  runDocumentAgent,
};
