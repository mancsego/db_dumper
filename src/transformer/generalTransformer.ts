const setToNull = () => null

const setToDefault = () => 'DEFAULT'

const toIsoDate = (dateString: string) =>
  `"${new Date(dateString).toISOString().slice(0, 19).replace('T', ' ')}"`

export { setToNull, setToDefault, toIsoDate }
