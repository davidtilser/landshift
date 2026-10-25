/** Present legacy research labels as planning copy without changing source data. */
export function poloPlanningText(text: string): string {
  if (/UI integration pending|ready for later UI integration/i.test(text))
    return 'Heat delivery, water savings and roof performance need further assessment.'
  return text
    .replace(/\bdemo area\b/gi, 'site area')
    .replace(/\bdemo boundary\b/gi, 'site boundary')
    .replace(/\bdemo\b/gi, 'project')
    .replace(/\bFictional educational campus\b/g, 'Proposed campus')
    .replace(/\bfictional model pool\b/gi, 'proposed neighborhood pool')
    .replace(/\bauthored visual checkpoint\b/gi, 'planned construction stage')
    .replace(/\bAuthored\b/g, 'Selected')
    .replace(/\bauthored\b/g, 'selected')
    .replace(/\bteaching\b/gi, 'planning')
}
