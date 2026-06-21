import { distance } from 'fastest-levenshtein'

// ─── Field definitions ──────────────────────────────────────────────────────
//
// Each field a Sample record stores, with the label aliases we expect to see in
// a table and the value type used to coerce/validate the extracted text.

export const FIELDS = [
    { key: 'water_temperature', type: 'number', range: [-10, 100], aliases: ['water temperature', 'water temp', 'temperature', 'temp'] },
    { key: 'ph', type: 'number', range: [0, 14], aliases: ['ph level', 'ph value', 'ph'] },
    { key: 'tds', type: 'number', range: [0, 1000000], aliases: ['total dissolved solids', 'tds'] },
    { key: 'do', type: 'number', range: [0, 1000000], aliases: ['dissolved oxygen', 'do'] },
    { key: 'latitude', type: 'number', range: [-90, 90], aliases: ['latitude', 'lat'] },
    { key: 'longitude', type: 'number', range: [-180, 180], aliases: ['longitude', 'long', 'lng', 'lon'] },
    { key: 'collection_date', type: 'date', aliases: ['collection date', 'sampled on', 'date collected', 'date'] },
    { key: 'location_name', type: 'string', aliases: ['location name', 'location', 'site name', 'site'] },
    { key: 'collected_by', type: 'string', aliases: ['collected by', 'collector', 'sampled by'] },
    { key: 'isolation_source', type: 'string', aliases: ['isolation source', 'source'] },
    { key: 'sample_analysis_type', type: 'analysis', aliases: ['sample analysis type', 'analysis type', 'analysis'] },
]

const MAX_ALIAS_WORDS = 3

const ALL_FIELD_ALIASES = FIELDS.flatMap((f) => f.aliases)

// ─── Text helpers ────────────────────────────────────────────────────────────

const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * Returns a 0..1 score for how well a candidate label string matches an alias.
 * Short aliases (<= 3 chars, e.g. "ph", "do", "lat") must match exactly to
 * avoid false positives; longer aliases allow substring / fuzzy matches.
 */
function aliasScore(candidateNorm, aliasNorm) {
    if (!candidateNorm || !aliasNorm) return 0
    if (candidateNorm === aliasNorm) return 1
    if (aliasNorm.length <= 3) return 0
    if (candidateNorm.includes(aliasNorm) || aliasNorm.includes(candidateNorm)) return 0.95
    const sim = 1 - distance(candidateNorm, aliasNorm) / Math.max(candidateNorm.length, aliasNorm.length)
    return sim >= 0.82 ? sim : 0
}

// ─── Value coercion ──────────────────────────────────────────────────────────

function coerceNumber(text, range) {
    const match = String(text).replace(',', '.').match(/-?\d+(?:\.\d+)?/)
    if (!match) return null
    const value = parseFloat(match[0])
    if (!Number.isFinite(value)) return null
    if (range && (value < range[0] || value > range[1])) return null
    return value
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function coerceDate(text) {
    const raw = String(text).trim()
    const pad = (n) => String(n).padStart(2, '0')

    // ISO: 2024-03-12
    let m = raw.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
    if (m) {
        const [, y, mo, d] = m
        if (+mo >= 1 && +mo <= 12 && +d >= 1 && +d <= 31) return `${y}-${pad(mo)}-${pad(d)}`
    }

    // Day-first: 12/03/2024 or 12-03-2024 (assume DD/MM/YYYY)
    m = raw.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)
    if (m) {
        const [, d, mo, y] = m
        if (+mo >= 1 && +mo <= 12 && +d >= 1 && +d <= 31) return `${y}-${pad(mo)}-${pad(d)}`
    }

    // Named month: 12 March 2024 / March 12, 2024
    const lower = raw.toLowerCase()
    const monthIdx = MONTHS.findIndex((mon) => lower.includes(mon))
    if (monthIdx !== -1) {
        const day = lower.match(/\b(\d{1,2})\b/)
        const year = lower.match(/\b(\d{4})\b/)
        if (day && year) return `${year[1]}-${pad(monthIdx + 1)}-${pad(day[1])}`
    }

    return null
}

function coerceAnalysis(text) {
    const n = normalize(text)
    if (n.includes('meta')) return 'Metagenomic'
    if (n.includes('wgs') || n.includes('wholegenome')) return 'WGS'
    return null
}

function coerceValue(field, text) {
    if (text == null || String(text).trim() === '') return null
    switch (field.type) {
        case 'number':
            return coerceNumber(text, field.range)
        case 'date':
            return coerceDate(text)
        case 'analysis':
            return coerceAnalysis(text)
        case 'string':
            return String(text).trim() || null
        default:
            return null
    }
}

// ─── Geometry: cluster words into rows ───────────────────────────────────────

const centerY = (w) => (w.bbox.y0 + w.bbox.y1) / 2
const wordHeight = (w) => Math.abs(w.bbox.y1 - w.bbox.y0)

/**
 * Groups OCR words into visual rows by vertical proximity. Each row is a list of
 * words sorted left-to-right. Rows are returned top-to-bottom.
 */
function clusterRows(words) {
    const valid = words
        .filter((w) => w && w.bbox && String(w.text).trim() !== '')
        .sort((a, b) => centerY(a) - centerY(b))

    if (valid.length === 0) return []

    const heights = valid.map(wordHeight).sort((a, b) => a - b)
    const medianHeight = heights[Math.floor(heights.length / 2)] || 10
    const threshold = medianHeight * 0.7

    const rows = []
    let current = [valid[0]]
    let rowCenter = centerY(valid[0])

    for (let i = 1; i < valid.length; i++) {
        const w = valid[i]
        if (Math.abs(centerY(w) - rowCenter) <= threshold) {
            current.push(w)
            rowCenter = current.reduce((sum, x) => sum + centerY(x), 0) / current.length
        } else {
            rows.push(current.sort((a, b) => a.bbox.x0 - b.bbox.x0))
            current = [w]
            rowCenter = centerY(w)
        }
    }
    rows.push(current.sort((a, b) => a.bbox.x0 - b.bbox.x0))
    return rows
}

// ─── Label location ──────────────────────────────────────────────────────────

/**
 * Searches all rows for the best contiguous span of words matching any of the
 * field's aliases. Returns the matched span's geometry, or null.
 */
function findLabel(field, rows) {
    let best = null
    const aliasNorms = field.aliases.map(normalize)

    rows.forEach((row, rowIdx) => {
        for (let i = 0; i < row.length; i++) {
            for (let len = 1; len <= MAX_ALIAS_WORDS && i + len <= row.length; len++) {
                const span = row.slice(i, i + len)
                const candidateNorm = normalize(span.map((w) => w.text).join(''))
                for (const aliasNorm of aliasNorms) {
                    const score = aliasScore(candidateNorm, aliasNorm)
                    if (
                        score > 0 &&
                        (!best ||
                            score > best.score ||
                            (score === best.score && len > best.len))
                    ) {
                        best = {
                            score,
                            len,
                            rowIdx,
                            startIdx: i,
                            endIdx: i + len - 1,
                            x0: span[0].bbox.x0,
                            x1: span[span.length - 1].bbox.x1,
                        }
                    }
                }
            }
        }
    })

    return best
}

const wordsConfidence = (words) =>
    words.length ? Math.round(Math.min(...words.map((w) => (w.confidence ?? 0)))) : 0

/** The first contiguous cell of words, stopping at the first large x-gap. */
function firstCell(words) {
    if (!words.length) return []
    const cell = [words[0]]
    for (let i = 1; i < words.length; i++) {
        const gap = words[i].bbox.x0 - words[i - 1].bbox.x1
        const h = Math.abs(words[i].bbox.y1 - words[i].bbox.y0) || 12
        if (gap > h * 1.2) break
        cell.push(words[i])
    }
    return cell
}

/**
 * True if the text is (essentially) a field label — used to tell a header-row
 * layout (value sits below) from a key/value row (value sits to the right).
 * Requires a near-exact match so real values that merely contain a field word
 * (e.g. "Source Point") are not misclassified as headers.
 */
function isExactishFieldLabel(text) {
    const n = normalize(text)
    if (!n) return false
    return ALL_FIELD_ALIASES.some((a) => {
        const an = normalize(a)
        if (an.length < 4) return n === an
        return n === an || (n.includes(an) && n.length <= an.length + 3)
    })
}

/**
 * Given a located label, returns candidate value word-groups in priority order:
 * (1) the cells to the right on the same row, then (2) the cell directly below
 * whose horizontal range overlaps the label.
 */
function valueCandidates(label, rows) {
    const candidates = []
    const labelRow = rows[label.rowIdx]

    // (1) Value to the right on the same row — unless the next cell is itself a
    //     column header, which signals a header-row layout (value sits below).
    const rightAll = labelRow.slice(label.endIdx + 1)
    const nextCellText = firstCell(rightAll)
        .map((w) => w.text)
        .join(' ')
    if (rightAll.length && !isExactishFieldLabel(nextCellText)) {
        candidates.push(rightAll)
    }

    // (2) Directly below: the next row whose words overlap the label's own
    //     horizontal span (header-row tables). Strict overlap is important — a
    //     looser bound would grab a neighbouring field's value from the next
    //     key/value row when this field's own value is missing/invalid.
    for (let r = label.rowIdx + 1; r < rows.length; r++) {
        const below = rows[r].filter((w) => w.bbox.x1 >= label.x0 && w.bbox.x0 <= label.x1)
        if (below.length) {
            candidates.push(below)
            break
        }
    }

    return candidates
}

/**
 * Pure, testable extraction core. Takes OCR words (each with `text`,
 * `confidence`, and `bbox` {x0,y0,x1,y1}) and returns the recognised Sample
 * fields plus a per-field confidence (0-100).
 * @returns {{fields: object, confidence: object}}
 */
export function extractFieldsFromWords(words) {
    return extractFieldsFromRows(clusterRows(words || []))
}

function extractFieldsFromRows(rows) {
    const fields = {}
    const confidence = {}

    for (const field of FIELDS) {
        const label = findLabel(field, rows)
        if (!label) continue

        for (const candidate of valueCandidates(label, rows)) {
            const text = candidate.map((w) => w.text).join(' ').trim()
            const value = coerceValue(field, text)
            if (value !== null && value !== undefined && value !== '') {
                fields[field.key] = value
                confidence[field.key] = wordsConfidence(candidate)
                break
            }
        }
    }

    return { fields, confidence }
}

// ─── Sub-table & gene-list definitions ───────────────────────────────────────
//
// Beyond the flat Sample fields, an image may also contain the multi-row
// "analysis details" tables (Metagenomic / WGS records) and gene lists.

const METAGENOMIC_COLUMNS = [
    { key: 'sequence_name', aliases: ['sequence name', 'sequence', 'seq name'] },
    { key: 'element_type', aliases: ['element type', 'element'] },
    { key: 'class', aliases: ['class'] },
    { key: 'subclass', aliases: ['subclass', 'sub class'] },
]

const WGS_COLUMNS = [
    { key: 'isolateID', aliases: ['isolate id', 'isolate', 'isolateid'] },
    { key: 'organism', aliases: ['organism', 'species'] },
]

const AMR_GENE_ALIASES = ['amr resistance genes', 'amr genes', 'resistance genes']
const VIRULENCE_GENE_ALIASES = ['virulence genes', 'virulence']

// Labels that mark the start of a *different* section, used to stop a multi-row
// table or gene list from bleeding into the next section.
const SECTION_STOP_ALIASES = [
    ...AMR_GENE_ALIASES,
    ...VIRULENCE_GENE_ALIASES,
    'sequence name',
    'isolate id',
    'organism',
    'element type',
]

const xCenter = (w) => (w.bbox.x0 + w.bbox.x1) / 2

/**
 * Strict score for header/section-label detection: exact match, or the candidate
 * fully containing the alias phrase. Unlike `aliasScore`, it does NOT treat a
 * short candidate as matching a longer alias (so a value like "AMR" does not
 * match the "AMR Genes" section label) and does no fuzzy matching.
 */
function labelScore(candidateNorm, aliasNorm) {
    if (!candidateNorm || !aliasNorm) return 0
    if (candidateNorm === aliasNorm) return 1
    if (aliasNorm.length >= 4 && candidateNorm.includes(aliasNorm)) return 0.9
    return 0
}

/**
 * Best-matching contiguous span for any alias within a single row, using the
 * strict label score. On ties, the longer span wins (so "Virulence Genes" beats
 * the bare "Virulence" alias).
 */
function matchSpanInRow(row, aliases) {
    const aliasNorms = aliases.map(normalize)
    let best = null
    for (let i = 0; i < row.length; i++) {
        for (let len = 1; len <= MAX_ALIAS_WORDS && i + len <= row.length; len++) {
            const span = row.slice(i, i + len)
            const cand = normalize(span.map((w) => w.text).join(''))
            for (const aliasNorm of aliasNorms) {
                const score = labelScore(cand, aliasNorm)
                if (
                    score > 0 &&
                    (!best ||
                        score > best.score ||
                        (score === best.score && len > best.span))
                ) {
                    best = {
                        score,
                        span: len,
                        afterIndex: i + len,
                        center: (span[0].bbox.x0 + span[span.length - 1].bbox.x1) / 2,
                    }
                }
            }
        }
    }
    return best
}

const rowMatchesAny = (row, aliases) => {
    const m = matchSpanInRow(row, aliases)
    return !!m && m.score >= 0.9
}

/** Finds the row that best serves as a header for the given column set. */
function findHeaderRow(rows, columns) {
    let best = null
    rows.forEach((row, rowIdx) => {
        const matched = []
        for (const col of columns) {
            const m = matchSpanInRow(row, col.aliases)
            if (m && m.score >= 0.9) matched.push({ key: col.key, center: m.center })
        }
        if (matched.length >= 2 && (!best || matched.length > best.matched.length)) {
            best = { rowIdx, matched }
        }
    })
    return best
}

/**
 * Extracts a multi-row record table. Locates the header row, derives a column
 * x-center for each matched column, then assigns each data word to its nearest
 * column. Stops at a blank row or a row that starts a different section.
 */
function extractRecordTable(rows, columns, stopAliases) {
    const header = findHeaderRow(rows, columns)
    if (!header) return []

    const centers = header.matched
    const records = []

    for (let r = header.rowIdx + 1; r < rows.length; r++) {
        if (stopAliases && rowMatchesAny(rows[r], stopAliases)) break

        const buckets = {}
        for (const w of rows[r]) {
            const wc = xCenter(w)
            let nearest = null
            let nearestDist = Infinity
            for (const c of centers) {
                const d = Math.abs(wc - c.center)
                if (d < nearestDist) {
                    nearestDist = d
                    nearest = c.key
                }
            }
            if (nearest) (buckets[nearest] ||= []).push(w.text)
        }

        const record = {}
        let any = false
        for (const c of centers) {
            const value = (buckets[c.key] || []).join(' ').trim()
            if (value) {
                record[c.key] = value
                any = true
            }
        }
        if (!any) break

        if ('isolateID' in record) {
            const n = parseInt(String(record.isolateID).replace(/[^\d-]/g, ''), 10)
            if (Number.isFinite(n)) record.isolateID = n
        }
        records.push(record)
    }

    return records
}

const splitGenes = (text) =>
    [...new Set(
        text
            .split(/[,;]+|\s+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && s.toLowerCase() !== 'none' && /[a-z0-9]/i.test(s)),
    )]

/**
 * Extracts a gene list following a section label (e.g. "AMR Genes: a, b, c").
 * Collects tokens to the right of the label and on following rows, stopping at
 * the next section label.
 */
function extractGeneList(rows, sectionAliases) {
    let loc = null
    for (let r = 0; r < rows.length && !loc; r++) {
        const m = matchSpanInRow(rows[r], sectionAliases)
        if (m && m.score >= 0.9) loc = { rowIdx: r, afterIndex: m.afterIndex }
    }
    if (!loc) return []

    const tokens = rows[loc.rowIdx].slice(loc.afterIndex).map((w) => w.text)
    for (let r = loc.rowIdx + 1; r < rows.length; r++) {
        if (rowMatchesAny(rows[r], SECTION_STOP_ALIASES)) break
        tokens.push(...rows[r].map((w) => w.text))
    }

    return splitGenes(tokens.join(' '))
}

/**
 * Full extraction: flat Sample fields plus the analysis-detail record tables
 * (Metagenomic / WGS) and gene lists (AMR / virulence).
 * @returns {{fields: object, confidence: object, metagenomic: object[],
 *   wgs: object[], amrGenes: string[], virulenceGenes: string[]}}
 */
export function extractAllFromWords(words) {
    const rows = clusterRows(words || [])
    const { fields, confidence } = extractFieldsFromRows(rows)

    return {
        fields,
        confidence,
        metagenomic: extractRecordTable(rows, METAGENOMIC_COLUMNS, SECTION_STOP_ALIASES),
        wgs: extractRecordTable(rows, WGS_COLUMNS, SECTION_STOP_ALIASES),
        amrGenes: extractGeneList(rows, AMR_GENE_ALIASES),
        virulenceGenes: extractGeneList(rows, VIRULENCE_GENE_ALIASES),
    }
}

// ─── Multi-sample table (one row per sample) ─────────────────────────────────
//
// For images where each ROW of a table is a separate sample. Uses the flat
// Sample FIELDS as columns; the header row must match at least a few of them so
// a single-sample key/value layout (one label per row) is not misread as a table.

const MIN_SAMPLE_TABLE_COLUMNS = 3

// A data row needs at least this many recognised fields to count as a real
// sample (unless it has a coordinate). Filters out OCR noise / stray cells.
const MIN_SAMPLE_ROW_FIELDS = 2

function findSampleHeaderRow(rows) {
    let best = null
    rows.forEach((row, rowIdx) => {
        const matched = []
        const seen = new Set()
        for (const field of FIELDS) {
            const m = matchSpanInRow(row, field.aliases)
            if (m && m.score >= 0.9 && !seen.has(field.key)) {
                seen.add(field.key)
                matched.push({ key: field.key, field, center: m.center })
            }
        }
        if (
            matched.length >= MIN_SAMPLE_TABLE_COLUMNS &&
            (!best || matched.length > best.matched.length)
        ) {
            best = { rowIdx, matched }
        }
    })
    return best
}

/**
 * Extracts one sample per data row from a wide sample table. Returns an array of
 * typed Sample field objects. Rows are kept as long as they carry at least one
 * recognised field — coordinates are optional, so samples without latitude or
 * longitude are still returned (they just won't appear on the dashboard map).
 */
export function extractSampleRows(words) {
    const rows = clusterRows(words || [])
    const header = findSampleHeaderRow(rows)
    if (!header) return []

    const samples = []
    for (let r = header.rowIdx + 1; r < rows.length; r++) {
        const buckets = {}
        for (const w of rows[r]) {
            const wc = xCenter(w)
            let nearest = null
            let nearestDist = Infinity
            for (const c of header.matched) {
                const d = Math.abs(wc - c.center)
                if (d < nearestDist) {
                    nearestDist = d
                    nearest = c
                }
            }
            if (nearest) (buckets[nearest.key] ||= []).push(w.text)
        }

        const sample = {}
        for (const c of header.matched) {
            const text = (buckets[c.key] || []).join(' ').trim()
            if (!text) continue
            const value = coerceValue(c.field, text)
            if (value !== null && value !== undefined && value !== '') {
                sample[c.key] = value
            }
        }

        // Keep the row if it carries real content. Coordinates are optional, but
        // a single stray field (e.g. an unrelated sub-table's cell drifting into a
        // column) is treated as OCR noise and dropped. A valid coordinate on its
        // own is enough to count as a real sample row.
        const hasCoordinate = sample.latitude != null || sample.longitude != null
        if (Object.keys(sample).length >= MIN_SAMPLE_ROW_FIELDS || hasCoordinate) {
            samples.push(sample)
        }
    }

    return samples
}
