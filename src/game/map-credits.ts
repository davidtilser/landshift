/** Puts nodes before the map attribution so dialogs are earlier in tab order. */
export function insertBeforeMapCredits(
  parent: ParentNode,
  ...nodes: Node[]
): void {
  const credits = parent.querySelector('#cesium-credits')
  for (const node of nodes) {
    if (credits) parent.insertBefore(node, credits)
    else parent.append(node)
  }
}
