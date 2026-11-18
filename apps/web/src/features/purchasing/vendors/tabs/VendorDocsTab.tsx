/** Vendor profile — Documents tab (empty state until backend file storage arrives). */
export function VendorDocsTab() {
  return (
    <div
      role="status"
      aria-label="Documents"
      className="max-w-[620px] animate-sf-fade rounded-xl border border-border bg-card px-[26px] py-10 text-center"
    >
      <div className="text-sm font-semibold">No documents attached</div>
      <div className="mt-[7px] text-[12.5px] text-pretty text-muted-foreground">
        GST registration, rate contracts, glaze and kiln test reports, and signed challans will live here. File storage arrives with the backend — nothing can be uploaded in the prototype.
      </div>
    </div>
  )
}
