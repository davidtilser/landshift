interface TypeCopy {
  label: string
  title: string
  body: string
}

const sharedCopy: TypeCopy = {
  label: 'Region',
  title: 'Shared title',
  body: 'Menu and game use one type.',
}

export function createTypeSample(copy: TypeCopy = sharedCopy): HTMLDivElement {
  const sample = document.createElement('div')
  sample.className = 'ls-type'
  sample.append(
    line('ls-label', copy.label),
    line('ls-title', copy.title),
    line('ls-body', copy.body),
  )
  return sample
}

function line(className: string, text: string): HTMLParagraphElement {
  const element = document.createElement('p')
  element.className = className
  element.textContent = text
  return element
}
