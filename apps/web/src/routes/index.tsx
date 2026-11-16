import { createFileRoute, redirect } from '@tanstack/react-router'
import { DEFAULT_LANDING } from '@/app/nav'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({
      to: '/$module/$page',
      params: { module: DEFAULT_LANDING.module, page: DEFAULT_LANDING.slug },
      replace: true,
    })
  },
})
