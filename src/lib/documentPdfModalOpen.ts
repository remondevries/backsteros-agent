let openModalCount = 0;

export function setDocumentPdfModalOpen(open: boolean): void {
  openModalCount += open ? 1 : -1;
  if (openModalCount < 0) {
    openModalCount = 0;
  }
}

export function isDocumentPdfModalOpen(): boolean {
  return openModalCount > 0;
}
