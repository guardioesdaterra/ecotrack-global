import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeVisible(): R;
      toBeChecked(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveClass(className: string): R;
      toHaveTextContent(text: string | RegExp): R;
      toHaveValue(value: string | string[] | number): R;
      toBeInvalid(): R;
      toBeValid(): R;
      toHaveFocus(): R;
      toContainElement(element: HTMLElement | null): R;
      toBeEmpty(): R;
      toContainHTML(htmlText: string): R;
      toHaveStyle(css: string | Record<string, any>): R;
    }
  }
} 