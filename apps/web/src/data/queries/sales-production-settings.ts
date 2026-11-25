/** Hooks for Settings ▸ Sales pricing and Settings ▸ Assembly & production — and the readers of those settings. */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ProductionConfig, type SalesPricingConfig, settingsApi } from '@/data/api/settings'
import { DEFAULT_PRODUCTION_SETTINGS, type ProductionSettings } from '@/domain/assembly-order'
import { DEFAULT_SALES_PRICING_SETTINGS, type SalesPricingSettings } from '@/domain/sales-prices'
import { useSettings } from './settings'

/** The customer-pricing rules in force (the defaults until the workspace settings load). */
export function useSalesPricingSettings(): SalesPricingSettings {
  return useSettings().data?.salesPricing ?? DEFAULT_SALES_PRICING_SETTINGS
}

/** The assembly & production settings in force (the defaults until the workspace settings load). */
export function useProductionSettings(): ProductionSettings {
  return useSettings().data?.production ?? DEFAULT_PRODUCTION_SETTINGS
}

export function useUpdateSalesPricing() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (next: SalesPricingConfig) => settingsApi.updateSalesPricing(next),
    onSuccess: (data) => client.setQueryData(['settings'], data),
  })
}

export function useUpdateProduction() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (next: ProductionConfig) => settingsApi.updateProduction(next),
    onSuccess: (data) => client.setQueryData(['settings'], data),
  })
}
