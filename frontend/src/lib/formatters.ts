export const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value)
}

export const formatDate = (value: string | null) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export const formatDateTime = (value: string | null) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const formatFileSize = (value: number | null) => {
  if (!value) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`
  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

export const formatBoolean = (value: boolean | null) => {
  if (value === null || value === undefined) return '-'
  return value ? 'Yes' : 'No'
}

export const formatValue = (value: any, type?: string) => {
  switch (type) {
    case 'currency':
      return formatCurrency(value)
    case 'date':
      return formatDate(value)
    case 'dateTime':
      return formatDateTime(value)
    case 'fileSize':
      return formatFileSize(value)
    case 'boolean':
      return formatBoolean(value)
    case 'json':
      if (!value) return '-'
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          return JSON.stringify(parsed, null, 2)
        } catch {
          return value
        }
      }
      return JSON.stringify(value, null, 2)
    default:
      return value ?? '-'
  }
}