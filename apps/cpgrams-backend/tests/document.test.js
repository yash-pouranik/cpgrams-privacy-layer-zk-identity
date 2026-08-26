'use strict';

process.env.NODE_ENV = 'test';
process.env.MOCK_AI = 'true';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const {
  buildMockDocumentResponse,
  readDocumentContent,
  runDocumentAgent,
} = require('../src/ai/agents/documents/document.agent');

test('Phase 4 document intelligence', async (t) => {
  await t.test('government notice image is classified as relevant', async () => {
    const filePath = path.join(os.tmpdir(), `cpgrams-image-${Date.now()}.png`);
    await fs.writeFile(filePath, Buffer.from('not-a-real-image-fixture'));
    try {
      const result = await runDocumentAgent({
      caseId: 'CPG-DOC-01',
      documentId: 'DOC-01',
      originalName: 'government-road-notice.png',
      mimeType: 'image/png',
      filePath,
      });
      assert.equal(result.output.isRelevant, true);
      assert.equal(result.output.documentId, 'DOC-01');
      assert.ok(result.output.relevanceScore > 0.5);
    } finally {
      await fs.rm(filePath, { force: true });
    }
  });

  await t.test('PDF text is passed to the analysis context', async () => {
    const filePath = path.join(os.tmpdir(), `cpgrams-document-${Date.now()}.pdf`);
    await fs.writeFile(filePath, 'Work Order\nContractor: ABC Infra\nAmount: Rs 45,00,000\nDate: 2026-02-14');
    try {
      const content = await readDocumentContent({ filePath, mimeType: 'application/pdf' });
      assert.match(content.extractedText, /ABC Infra/);
      assert.equal(content.imageDataUrl, null);
    } finally {
      await fs.rm(filePath, { force: true });
    }
  });

  await t.test('irrelevant selfie is flagged and scored low', () => {
    const output = buildMockDocumentResponse({
      documentId: 'DOC-03', originalName: 'selfie.jpg', mimeType: 'image/jpeg',
    }, '');
    assert.equal(output.isRelevant, false);
    assert.equal(output.supportsComplaint, false);
    assert.ok(output.relevanceScore < 0.4);
    assert.ok(output.flags.length > 0);
  });
});
