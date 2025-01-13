const maskText = (s: string) => (s ? s[0] + '*'.repeat(s.length - 1) : '')

export { maskText }
