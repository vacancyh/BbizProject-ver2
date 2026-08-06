"use client";

/**
 * 다국어 입력 필드 (2026-08-05 신설)
 *
 * ── 왜 만들었나 ────────────────────────────────────────────────────────────
 * 상품 상세 드로어에 `KR / EN / JP` 언어 탭이 **화면에만 있고 동작하지 않았다.**
 * 탭을 눌러도 입력칸은 늘 기본(한국어) 필드에 묶여 있어서, 영어를 넣을 방법이 없었다.
 *
 * 솔루션으로 팔려면 운영자가 상품을 올릴 때마다 **직접** 영어를 넣을 수 있어야 한다.
 * 개발자를 부를 수는 없으니까.
 *
 * ── 어떻게 동작하나 ────────────────────────────────────────────────────────
 * · 언어 탭은 **스토어에 지정된 지원 언어**에서 만든다(KR/EN/JP 하드코딩 아님).
 *   지원 언어를 늘리면 탭이 저절로 늘어난다.
 * · 첫 번째 언어 = **기본 언어**. 원본 레코드의 필드를 그대로 쓴다(번역이 아니다).
 * · 나머지 언어 = 번역 테이블에 저장된다.
 * · 번역이 비어 있는 언어 탭에는 점(•)을 찍어 "아직 안 넣었다"를 알린다.
 *
 * ── 쓰는 쪽에서 할 일 ──────────────────────────────────────────────────────
 * 기본 언어 값은 **부모가 가진 기존 상태**를 그대로 쓴다(baseValues/onBaseChange).
 * 번역 값만 이 컴포넌트가 들고 있다가, 저장 시 `save()` 를 호출하면 된다.
 *
 *   const tr = useRef<TranslationFieldsHandle>(null)
 *   <TranslationFields ref={tr} reference="product" referenceId={id} … />
 *   // 저장 버튼에서: await tr.current?.save()
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import {
  listSupportedLocales,
  listTranslations,
  saveTranslations,
  type Locale,
  type Translation,
} from "@/lib/api/translations";

export type TranslationFieldsHandle = {
  /** 번역을 저장한다. 기본 언어 값은 부모가 따로 저장해야 한다. */
  save: () => Promise<void>;
  /** 저장 이후 다시 읽어 화면을 맞춘다. */
  reload: () => Promise<void>;
};

type FieldDef = {
  /** 번역 대상 필드명 — 백엔드 translation_settings 의 fields 와 같아야 한다 */
  name: string;
  label: string;
  /** 여러 줄 입력 */
  multiline?: boolean;
  placeholder?: string;
};

/**
 * 이 어드민에는 스타일 체계가 두 가지다.
 *  · "screen"   프로토타입 이식 화면 — screen.css 의 .frow/.inp/.lang-tab (상품 등)
 *  · "tailwind" 이후 만든 화면 — Tailwind 유틸 (카테고리 등)
 * 어느 화면에 넣어도 주변과 어울리도록 두 벌을 지원한다.
 */
type Variant = "screen" | "tailwind";

type Props = {
  /** 엔티티 이름 (예: "product", "product_category") */
  reference: string;
  /** 레코드 id. 신규 생성 중이면 null — 번역 입력을 막고 안내한다 */
  referenceId: string | null;
  /** 번역 대상 필드 정의 */
  fields: FieldDef[];
  /** 기본 언어(원본) 값 — 부모 상태 */
  baseValues: Record<string, string>;
  /** 기본 언어 값 변경 */
  onBaseChange: (name: string, value: string) => void;
  /** 주변 화면의 스타일 체계 (기본: screen.css) */
  variant?: Variant;
};

/** 스타일 체계별 클래스 — 마크업을 두 벌 만들지 않기 위해 클래스만 갈아끼운다. */
const CLS: Record<Variant, { row: string; label: string; input: string; hint: string }> = {
  screen: { row: "frow", label: "field-l", input: "inp", hint: "hint" },
  tailwind: {
    row: "block",
    label: "mb-1 block text-xs font-medium text-text-2",
    input:
      "w-full rounded-sm border border-border bg-surface p-2 text-sm outline-none focus:border-primary disabled:opacity-50",
    hint: "text-xs text-text-3",
  },
};

export const TranslationFields = forwardRef<TranslationFieldsHandle, Props>(
  function TranslationFields(
    { reference, referenceId, fields, baseValues, onBaseChange, variant = "screen" },
    ref
  ) {
    const cls = CLS[variant];
    const [locales, setLocales] = useState<Locale[]>([]);
    const [active, setActive] = useState<string>("");
    const [existing, setExisting] = useState<Translation[]>([]);
    /** 언어코드 → (필드명 → 값). 기본 언어는 여기 담지 않는다. */
    const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const baseCode = locales[0]?.code ?? "";
    const isBase = active === baseCode;

    /** 지원 언어 목록 — 번역 기능이 꺼져 있으면 조용히 비활성화된다. */
    useEffect(() => {
      let alive = true;
      (async () => {
        try {
          const ls = await listSupportedLocales();
          if (!alive) return;
          setLocales(ls);
          setActive(ls[0]?.code ?? "");
        } catch {
          // 번역 모듈 미활성(404) 등 — 다국어 UI 를 숨기고 기본 입력만 남긴다
          if (alive) setLocales([]);
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, []);

    const load = useCallback(async () => {
      if (!referenceId) {
        setExisting([]);
        setDrafts({});
        return;
      }
      try {
        const rows = await listTranslations(reference, referenceId);
        setExisting(rows);
        const next: Record<string, Record<string, string>> = {};
        for (const r of rows) next[r.locale_code] = { ...r.translations };
        setDrafts(next);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "번역을 불러오지 못했습니다.");
      }
    }, [reference, referenceId]);

    useEffect(() => {
      void load();
    }, [load]);

    useImperativeHandle(ref, () => ({
      save: async () => {
        if (!referenceId) return;
        // 기본 언어는 번역이 아니므로 제외하고 보낸다
        const byLocale: Record<string, Record<string, string>> = {};
        for (const [code, vals] of Object.entries(drafts)) {
          if (code === baseCode) continue;
          byLocale[code] = vals;
        }
        await saveTranslations({ reference, referenceId, byLocale, existing });
      },
      reload: load,
    }));

    // 지원 언어가 1개 이하면 다국어 UI 가 의미 없다 → 기본 입력만 보여준다
    const multilingual = locales.length > 1;

    const valueOf = (name: string) =>
      isBase ? baseValues[name] ?? "" : drafts[active]?.[name] ?? "";

    const setValue = (name: string, v: string) => {
      if (isBase) {
        onBaseChange(name, v);
        return;
      }
      setDrafts((d) => ({ ...d, [active]: { ...(d[active] ?? {}), [name]: v } }));
    };

    /** 해당 언어에 값이 하나라도 채워져 있는가 — 탭의 미입력 표시용 */
    const hasAny = (code: string) => {
      if (code === baseCode) return fields.some((f) => (baseValues[f.name] ?? "").trim());
      const d = drafts[code];
      return !!d && Object.values(d).some((v) => (v ?? "").trim());
    };

    if (loading) return null;

    return (
      <>
        {multilingual && (
          // `.lang-tab` 클래스는 상품 목록의 상태 필터 칩도 쓰고 있다.
          // 테스트·자동화가 엉뚱한 칩을 집지 않도록 전용 훅을 준다.
          <div
            className="lang-tabs"
            role="tablist"
            aria-label="언어 선택"
            data-testid="translation-lang-tabs"
          >
            {locales.map((l) => {
              const filled = hasAny(l.code);
              return (
                <span
                  key={l.code}
                  role="tab"
                  aria-selected={active === l.code}
                  title={l.name}
                  className={`lang-tab${active === l.code ? " active" : ""}`}
                  onClick={() => setActive(l.code)}
                >
                  {shortLabel(l.code)}
                  {/* 아직 아무것도 안 넣은 언어를 눈에 띄게 — 빠뜨리기 쉽다 */}
                  {!filled && l.code !== baseCode && (
                    <span aria-label="미입력" style={{ marginLeft: 4, opacity: 0.6 }}>
                      •
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {multilingual && !isBase && !referenceId && (
          <p className={cls.hint} style={{ margin: "4px 0 8px" }}>
            먼저 저장한 뒤에 번역을 입력할 수 있습니다.
          </p>
        )}
        {error && (
          <p className={cls.hint} style={{ margin: "4px 0 8px", color: "var(--danger)" }}>
            {error}
          </p>
        )}

        {fields.map((f) => (
          <div className={cls.row} key={f.name}>
            <span className={cls.label}>
              {f.label}
              {multilingual && !isBase && (
                <span style={{ marginLeft: 6, fontWeight: 400, opacity: 0.7 }}>
                  ({shortLabel(active)})
                </span>
              )}
            </span>
            {f.multiline ? (
              <textarea
                className={cls.input}
                rows={3}
                value={valueOf(f.name)}
                placeholder={placeholderFor(f, isBase, baseValues)}
                disabled={!isBase && !referenceId}
                onChange={(e) => setValue(f.name, e.target.value)}
              />
            ) : (
              <input
                className={cls.input}
                value={valueOf(f.name)}
                placeholder={placeholderFor(f, isBase, baseValues)}
                disabled={!isBase && !referenceId}
                onChange={(e) => setValue(f.name, e.target.value)}
              />
            )}
          </div>
        ))}
      </>
    );
  }
);

/** "ko-KR" → "KR". 탭이 좁으므로 지역 코드만 보여준다. */
function shortLabel(code: string): string {
  const parts = code.split("-");
  return (parts[1] ?? parts[0] ?? code).toUpperCase();
}

/**
 * 번역 탭에서는 기본 언어 값을 흐리게 보여준다 —
 * 무엇을 번역해야 하는지 옆 화면을 오가지 않아도 되게.
 */
function placeholderFor(
  f: FieldDef,
  isBase: boolean,
  baseValues: Record<string, string>
): string {
  if (isBase) return f.placeholder ?? "";
  const base = (baseValues[f.name] ?? "").trim();
  return base ? `원문: ${base}` : "번역할 원문이 비어 있습니다";
}
