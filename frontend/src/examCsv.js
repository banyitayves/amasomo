const examCsvHeaders = ['prompt', 'option_a', 'option_b', 'option_c', 'option_d', 'answer', 'explanation']

function parseRows(source) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  let quoteClosed = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
        quoteClosed = true
      } else {
        field += character
      }
    } else if (quoteClosed && character !== ',' && character !== '\n' && character !== '\r') {
      throw new Error('CSV contains unexpected characters after a quoted field.')
    } else if (character === '"' && !field.length) {
      quoted = true
    } else if (character === ',') {
      row.push(field)
      field = ''
      quoteClosed = false
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && source[index + 1] === '\n') index += 1
      row.push(field)
      if (row.some((cell) => cell.trim())) rows.push(row)
      row = []
      field = ''
      quoteClosed = false
    } else if (character === '"') {
      throw new Error('CSV contains a quote in an unquoted field.')
    } else {
      field += character
    }
  }

  if (quoted) throw new Error('CSV contains an unclosed quoted field.')
  row.push(field)
  if (row.some((cell) => cell.trim())) rows.push(row)
  return rows
}

export function parseExamCsv(source) {
  const rows = parseRows(source.replace(/^\uFEFF/, ''))
  if (!rows.length) throw new Error('The CSV file is empty.')

  const headers = rows[0].map((header) => header.trim().toLowerCase())
  const positions = Object.fromEntries(examCsvHeaders.map((header) => [header, headers.indexOf(header)]))
  const missing = examCsvHeaders.filter((header) => positions[header] < 0)
  if (missing.length) throw new Error(`CSV is missing required columns: ${missing.join(', ')}.`)
  if (new Set(headers).size !== headers.length) throw new Error('CSV column names must be unique.')

  const dataRows = rows.slice(1)
  if (!dataRows.length) throw new Error('Add at least one question below the CSV header.')
  if (dataRows.length > 100) throw new Error('A CSV import can contain at most 100 questions.')

  return dataRows.map((cells, index) => {
    const rowNumber = index + 2
    if (cells.length !== headers.length) throw new Error(`CSV row ${rowNumber} has a different number of columns than the header.`)
    const value = (header) => cells[positions[header]].trim()
    const question = {
      prompt: value('prompt'),
      options: {
        A: value('option_a'),
        B: value('option_b'),
        C: value('option_c'),
        D: value('option_d'),
      },
      answer: value('answer').toUpperCase(),
      explanation: value('explanation'),
    }
    if (!question.prompt || Object.values(question.options).some((option) => !option) || !question.explanation) {
      throw new Error(`CSV row ${rowNumber} must include a question, four choices, and an explanation.`)
    }
    if (!['A', 'B', 'C', 'D'].includes(question.answer)) {
      throw new Error(`CSV row ${rowNumber} answer must be A, B, C, or D.`)
    }
    return question
  })
}

export const examCsvTemplate = `${examCsvHeaders.join(',')}\r\n`
