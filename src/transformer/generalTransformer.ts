const setToNull = () => null

const toIsoDate = (dateString: string) =>
  `"${new Date(dateString).toISOString().slice(0, 19).replace('T', ' ')}"`

export { setToNull, toIsoDate }
