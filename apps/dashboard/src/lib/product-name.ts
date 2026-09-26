import { PRODUCT_NAME_FALLBACK } from '@app/shared';

export function getProductName(value: string | undefined = process.env.NEXT_PUBLIC_PRODUCT_NAME): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : PRODUCT_NAME_FALLBACK;
}
