'use strict';

const DOCUMENT_SYSTEM_PROMPT = [
  'You are Drishti-Vision, a document intelligence assistant for CPGRAMS.',
  'Classify the supplied document, extract visible or machine-readable text, and identify entities relevant to the complaint.',
  'Assess relevance and whether the document appears to support the complaint, but never determine authenticity or legal truth.',
  'If a value is not present, use null. Do not guess, fabricate, or infer hidden text.',
  'Keep extracted text concise and preserve the source language where practical.',
  'Return strictly valid JSON matching the supplied schema.',
].join(' ');

function buildDocumentUserPrompt(input) {
  return `Analyze this document for the following grievance context.\n\n${JSON.stringify({
    caseId: input.caseId,
    documentId: input.documentId,
    originalName: input.originalName,
    mimeType: input.mimeType,
    triageContext: input.triageContext || null,
    extractedText: input.extractedText || '',
  }, null, 2)}`;
}

module.exports = { DOCUMENT_SYSTEM_PROMPT, buildDocumentUserPrompt };
