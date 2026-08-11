import { getT } from "@lib/i18n"
import { listProductInquiries } from "@lib/data/inquiries"
import InquiryForm from "./inquiry-form"

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`
}

const ProductInquiries = async ({ productId }: { productId: string }) => {
  const t = await getT()
  const inquiries = await listProductInquiries(productId)

  return (
    <div className="w-full" data-testid="product-inquiries">
      <div className="flex items-baseline gap-x-3 mb-6">
        <h2 className="text-2xl-semi">{t("inquiry.sectionTitle")}</h2>
        <span className="txt-medium text-ui-fg-muted">({inquiries.length})</span>
      </div>

      {inquiries.length === 0 ? (
        <p className="txt-medium text-ui-fg-muted py-10 text-center">
          {t("inquiry.empty")}
        </p>
      ) : (
        <ul className="flex flex-col">
          {inquiries.map((q) => (
            <li
              key={q.id}
              className="border-b border-ui-border-base py-5 last:border-b-0"
            >
              <div className="flex items-start gap-x-2">
                <span className="text-ui-fg-interactive font-semibold shrink-0">
                  Q
                </span>
                <div className="flex-1">
                  <p className="txt-medium text-ui-fg-base whitespace-pre-line">
                    {q.content}
                  </p>
                  <p className="txt-small text-ui-fg-muted mt-1">
                    {q.author} · {formatDate(q.created_at)}
                  </p>
                </div>
                <span
                  className={
                    q.answered
                      ? "txt-small text-ui-fg-interactive shrink-0"
                      : "txt-small text-ui-fg-muted shrink-0"
                  }
                >
                  {q.answered ? t("inquiry.answered") : t("inquiry.pending")}
                </span>
              </div>
              {q.answered && q.reply && (
                <div className="flex items-start gap-x-2 mt-3 ml-1 rounded-rounded bg-ui-bg-subtle p-4">
                  <span className="text-ui-fg-base font-semibold shrink-0">A</span>
                  <p className="txt-medium text-ui-fg-subtle whitespace-pre-line">
                    {q.reply}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <InquiryForm productId={productId} />
    </div>
  )
}

export default ProductInquiries
