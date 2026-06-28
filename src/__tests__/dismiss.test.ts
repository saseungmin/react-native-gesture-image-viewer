import { getDismissDistance, shouldDismissByDirection } from '../utils/dismiss';

describe('dismiss direction helpers', () => {
  describe('shouldDismissByDirection', () => {
    it('only dismisses downward swipes in down mode', () => {
      expect(shouldDismissByDirection(81, 80, 'down')).toBe(true);
      expect(shouldDismissByDirection(80, 80, 'down')).toBe(false);
      expect(shouldDismissByDirection(-120, 80, 'down')).toBe(false);
    });

    it('only dismisses upward swipes in up mode', () => {
      expect(shouldDismissByDirection(-81, 80, 'up')).toBe(true);
      expect(shouldDismissByDirection(-80, 80, 'up')).toBe(false);
      expect(shouldDismissByDirection(120, 80, 'up')).toBe(false);
    });

    it('dismisses swipes in either direction in both mode', () => {
      expect(shouldDismissByDirection(81, 80, 'both')).toBe(true);
      expect(shouldDismissByDirection(-81, 80, 'both')).toBe(true);
      expect(shouldDismissByDirection(80, 80, 'both')).toBe(false);
      expect(shouldDismissByDirection(-80, 80, 'both')).toBe(false);
    });
  });

  describe('getDismissDistance', () => {
    it('only counts downward distance in down mode', () => {
      expect(getDismissDistance(120, 'down')).toBe(120);
      expect(getDismissDistance(-120, 'down')).toBe(0);
    });

    it('only counts upward distance in up mode', () => {
      expect(getDismissDistance(-120, 'up')).toBe(120);
      expect(getDismissDistance(120, 'up')).toBe(0);
    });

    it('counts absolute distance in both mode', () => {
      expect(getDismissDistance(120, 'both')).toBe(120);
      expect(getDismissDistance(-120, 'both')).toBe(120);
    });
  });
});
