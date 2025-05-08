import { renderHook, act } from '@testing-library/react';
import { useViewport } from '../use-viewport';

describe('useViewport', () => {
  // Store original window dimensions
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;
  
  // Mock document methods
  const originalDocumentStyle = document.documentElement.style;
  
  beforeEach(() => {
    // Set up spies
    jest.spyOn(document.documentElement.style, 'setProperty');
    
    // Reset window dimensions to known values for testing
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });
  });
  
  afterEach(() => {
    // Cleanup
    jest.restoreAllMocks();
    
    // Reset window dimensions
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: originalInnerWidth });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: originalInnerHeight });
  });
  
  test('initializes with correct dimensions', () => {
    const { result } = renderHook(() => useViewport());
    
    expect(result.current.width).toBe(1024);
    expect(result.current.height).toBe(768);
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.vh).toBe(7.68); // 1% of 768
    
    // Should set CSS variable
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--vh', '7.68px');
  });
  
  test('updates on window resize', () => {
    const { result } = renderHook(() => useViewport());
    
    // Initial state check
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isMobile).toBe(false);
    
    // Simulate resize to mobile dimensions
    act(() => {
      // Update window dimensions
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 667 });
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
    });
    
    // Check updated values
    expect(result.current.width).toBe(375);
    expect(result.current.height).toBe(667);
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.vh).toBe(6.67); // 1% of 667
    
    // Should set CSS variable with updated value
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--vh', '6.67px');
  });
  
  test('correctly identifies tablet size', () => {
    const { result } = renderHook(() => useViewport());
    
    // Simulate resize to tablet dimensions
    act(() => {
      // Update window dimensions
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 1024 });
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
    });
    
    // Check updated values
    expect(result.current.width).toBe(800);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });
}); 