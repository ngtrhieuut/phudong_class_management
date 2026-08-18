import { describe, expect, it } from 'vitest';

import {
  PRAISE_MEDIA_IMAGE_MAX_BYTES,
  PRAISE_MEDIA_MAX_BYTES,
  PRAISE_MEDIA_VIDEO_DISABLED_MESSAGE,
  parsePraiseMediaUploadPayload,
  sanitizePraiseImageBuffer,
  validatePraiseMediaContent,
  validatePraiseMediaMagicBytes,
  validatePraiseMediaQuarantinePathname,
  validatePraiseMediaPathname,
} from '../../src/lib/media/praise-media';

const validPayload = JSON.stringify({
  actorUserId: '11111111-1111-4111-8111-111111111111',
  organizationId: '22222222-2222-4222-8222-222222222222',
  classId: '33333333-3333-4333-8333-333333333333',
  postId: '44444444-4444-4444-8444-444444444444',
});

describe('praise media validation', () => {
  it('parses the signed upload payload and rejects malformed JSON', () => {
    expect(parsePraiseMediaUploadPayload(validPayload)).toMatchObject({
      classId: '33333333-3333-4333-8333-333333333333',
      postId: '44444444-4444-4444-8444-444444444444',
    });

    expect(() => parsePraiseMediaUploadPayload('{not-json')).toThrow('Thông tin upload không hợp lệ.');
    expect(() => parsePraiseMediaUploadPayload(null)).toThrow('Thông tin upload không hợp lệ.');
  });

  it('accepts safe pathnames and rejects traversal/control characters', () => {
    expect(validatePraiseMediaPathname('praise/2026/photo.webp')).toBe('praise/2026/photo.webp');
    expect(validatePraiseMediaQuarantinePathname('praise/quarantine/upload-1')).toBe('praise/quarantine/upload-1');
    expect(() => validatePraiseMediaQuarantinePathname('praise/sanitized/photo.webp')).toThrow('Tên file upload không hợp lệ.');
    expect(() => validatePraiseMediaPathname('../private.txt')).toThrow('Tên file không hợp lệ.');
    expect(() => validatePraiseMediaPathname('praise\\photo.webp')).toThrow('Tên file không hợp lệ.');
    expect(() => validatePraiseMediaPathname('praise/\u0000photo.webp')).toThrow('Tên file không hợp lệ.');
  });

  it('enforces the allowlist and per-type size limits', () => {
    expect(validatePraiseMediaContent('image/webp', 1024)).toBeUndefined();
    expect(() => validatePraiseMediaContent('video/mp4', 1024)).toThrow(PRAISE_MEDIA_VIDEO_DISABLED_MESSAGE);
    expect(() => validatePraiseMediaContent('image/svg+xml', 1024)).toThrow(
      'Ảnh phải thuộc loại được hỗ trợ và không quá 10 MB.',
    );
    expect(() => validatePraiseMediaContent('image/jpeg', PRAISE_MEDIA_IMAGE_MAX_BYTES + 1)).toThrow(
      'Ảnh phải thuộc loại được hỗ trợ và không quá 10 MB.',
    );
    expect(PRAISE_MEDIA_MAX_BYTES).toBe(PRAISE_MEDIA_IMAGE_MAX_BYTES);
  });

  it('re-encodes images, caps dimensions, and strips source metadata', async () => {
    const sharp = (await import('sharp')).default;
    const input = await sharp({
      create: { width: 3200, height: 1800, channels: 3, background: { r: 20, g: 120, b: 220 } },
    })
      .jpeg()
      .toBuffer();

    const sanitized = await sanitizePraiseImageBuffer(input);
    const metadata = await sharp(sanitized.buffer).metadata();

    expect(sanitized.contentType).toBe('image/webp');
    expect(sanitized.width).toBe(2400);
    expect(sanitized.height).toBe(1350);
    expect(metadata.format).toBe('webp');
    expect(metadata.exif).toBeUndefined();
    expect(metadata.xmp).toBeUndefined();
    expect(sanitized.buffer.byteLength).toBeLessThanOrEqual(PRAISE_MEDIA_IMAGE_MAX_BYTES);
  });

  it('requires the uploaded bytes to match the declared media type', () => {
    expect(() => validatePraiseMediaMagicBytes('image/png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).not.toThrow();
    expect(() => validatePraiseMediaMagicBytes('image/png', new Uint8Array([0xff, 0xd8, 0xff]))).toThrow('Nội dung file không khớp');
    expect(() => validatePraiseMediaMagicBytes('video/mp4', new Uint8Array([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70]))).toThrow(PRAISE_MEDIA_VIDEO_DISABLED_MESSAGE);
  });
});
