import { animatedFrameSize } from './visual-invitation-animated-export.service';

describe('animatedFrameSize', () => {
  it('uses a 9:16 canvas for mobile exports', () => {
    expect(animatedFrameSize('mobile', 390)).toEqual({ width: 390, height: 693 });
  });

  it('uses a 16:9 canvas for desktop exports', () => {
    expect(animatedFrameSize('desktop', 1920)).toEqual({ width: 1920, height: 1080 });
  });

  it('caps excessive output sizes', () => {
    expect(animatedFrameSize('tablet', 5000)).toEqual({ width: 1536, height: 2048 });
  });
});
