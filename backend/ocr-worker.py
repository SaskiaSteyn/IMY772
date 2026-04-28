#!/usr/bin/env python3
"""
PaddleOCR Worker Process
Accepts image data via stdin (JSON), extracts text, normalizes to sample-first format.
Sends results as JSON to stdout.
"""

import json
import sys
import traceback
import base64
import io
import os
import re
from time import time
import numpy as np

# Initialize PaddleOCR (lazy load to avoid startup delay)
paddle_initialized = False
ocr_unavailable = False
ocr = None

def init_paddle():
    """Initialize PaddleOCR model on first use"""
    global ocr, paddle_initialized, ocr_unavailable
    if paddle_initialized:
        return not ocr_unavailable
    
    try:
        from paddleocr import PaddleOCR

        # PaddleOCR expects a single language code, not a list.
        # If multiple languages are configured, use the first valid entry.
        lang_values = [value.strip() for value in os.getenv('OCR_PADDLE_LANGUAGES', 'en').split(',')]
        lang_values = [value for value in lang_values if value]
        lang = lang_values[0] if lang_values else 'en'

        # Try PaddleOCR v3-style arguments first, then fall back to v2-style.
        init_error = None
        try:
            ocr = PaddleOCR(lang=lang, use_textline_orientation=True, device='cpu')
        except TypeError as error:
            init_error = error
            try:
                ocr = PaddleOCR(use_angle_cls=True, lang=lang, use_gpu=False)
            except TypeError:
                ocr = PaddleOCR(use_angle_cls=True, lang=lang)

        paddle_initialized = True
        ocr_unavailable = False
        print(json.dumps({
            "type": "system",
            "message": "PaddleOCR initialized",
            "language": lang,
            "fallback": "v2" if init_error else "none"
        }), file=sys.stderr)
        return True
    except ModuleNotFoundError as e:
        print(json.dumps({
            "type": "error",
            "message": f"Failed to initialize PaddleOCR: {str(e)}"
        }), file=sys.stderr)
        paddle_initialized = True
        ocr_unavailable = True
        ocr = None
        return False
    except Exception as e:
        print(json.dumps({
            "type": "error",
            "message": f"Failed to initialize PaddleOCR: {str(e)}"
        }), file=sys.stderr)
        paddle_initialized = True
        ocr_unavailable = True
        ocr = None
        return False

def _to_float(value, default=0.0):
    """Best-effort numeric conversion for confidence values."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def normalize_ocr_lines(ocr_results):
    """Normalize OCR output from PaddleOCR v2/v3 APIs into text-confidence rows."""
    if not ocr_results:
        return []

    normalized = []

    def _box_center_and_height(box):
        try:
            points = box.tolist() if hasattr(box, 'tolist') else box
            if not isinstance(points, (list, tuple)) or len(points) == 0:
                return None, None, None
            xs = [float(p[0]) for p in points if isinstance(p, (list, tuple)) and len(p) >= 2]
            ys = [float(p[1]) for p in points if isinstance(p, (list, tuple)) and len(p) >= 2]
            if not xs or not ys:
                return None, None, None
            x_center = sum(xs) / len(xs)
            y_center = sum(ys) / len(ys)
            height = max(ys) - min(ys)
            return x_center, y_center, height
        except Exception:
            return None, None, None

    def append_line(text, confidence, box=None):
        if text is None:
            return
        text_value = str(text).strip()
        if not text_value:
            return
        x_center, y_center, height = _box_center_and_height(box)
        normalized.append({
            'text': text_value,
            'confidence': _to_float(confidence, 0.0),
            'x_center': x_center,
            'y_center': y_center,
            'height': height,
        })

    def parse_item(item):
        # PaddleOCR v3 predict() may return dict rows with batched text/scores.
        if isinstance(item, dict):
            rec_texts = item.get('rec_texts')
            rec_scores = item.get('rec_scores')
            dt_polys = item.get('dt_polys') or item.get('polys')
            if isinstance(rec_texts, list):
                for index, text in enumerate(rec_texts):
                    score = rec_scores[index] if isinstance(rec_scores, list) and index < len(rec_scores) else 1.0
                    box = dt_polys[index] if isinstance(dt_polys, list) and index < len(dt_polys) else None
                    append_line(text, score, box)
                return

            text = item.get('text') or item.get('rec_text')
            score = item.get('score') or item.get('rec_score') or 1.0
            append_line(text, score, item.get('box') or item.get('bbox') or item.get('poly'))
            return

        if isinstance(item, (list, tuple)):
            # PaddleOCR v2 line format: [box, (text, confidence)]
            if (
                len(item) >= 2
                and isinstance(item[1], (list, tuple))
                and len(item[1]) >= 2
                and isinstance(item[1][0], str)
            ):
                append_line(item[1][0], item[1][1], item[0])
                return

            # Collection of entries: recurse into each item first.
            if item and all(isinstance(entry, (list, tuple, dict)) for entry in item):
                for nested in item:
                    parse_item(nested)
                return

            # Simplified line format: [text, confidence]
            if len(item) >= 2 and isinstance(item[0], str):
                append_line(item[0], item[1])
                return

            # Nested collections
            for nested in item:
                parse_item(nested)

    parse_item(ocr_results)
    return normalized


def extract_samples_from_ocr(ocr_results, confidence_threshold):
    """
    Parse PaddleOCR output into normalized sample structure.
    PaddleOCR returns list of: [[text, confidence], box_coords]
    
    Attempts to extract structured sample data (sampleID, coordinates, measurements).
    Returns list of samples with low-confidence field tracking.
    """
    if not ocr_results:
        return [], {}
    
    low_confidence = {}
    samples = []
    current_sample = {}

    def assign_value(field_name, value, confidence):
        if value is None:
            return

        text_value = str(value).strip()
        if not text_value:
            return

        # Parse numeric fields when possible so downstream validation/editing is easier.
        if field_name in {'latitude', 'longitude', 'water_temperature', 'ph', 'tds', 'do'}:
            try:
                current_sample[field_name] = float(text_value)
            except ValueError:
                current_sample[field_name] = text_value
        else:
            current_sample[field_name] = text_value

        if confidence < confidence_threshold:
            if field_name not in low_confidence:
                low_confidence[field_name] = []
            low_confidence[field_name].append(text_value[:20])
    
    # Flatten OCR results into text lines
    ocr_lines = normalize_ocr_lines(ocr_results)
    text_lines = [item['text'] for item in ocr_lines]

    # Attempt CSV-like table parsing: detect header row with commas and map following rows
    def normalize_token(tok):
        return re.sub(r'[^a-z0-9]', '', tok.lower())

    header_keywords = {
        'sampleid', 'latitude', 'longitude', 'watertemperature', 'ph', 'tds', 'do',
        'sampleanalysistype', 'isolationsource', 'collectiondate', 'locationname',
        'collectedby', 'predictedsirprofile', 'sequencename', 'elementtype', 'class', 'subclass',
        'amrresistancegenes'
    }

    header_aliases = {
        'sampleid': 'sampleID', 'id': 'sampleID', 'sample': 'sampleID',
        'latitude': 'latitude', 'lat': 'latitude',
        'longitude': 'longitude', 'lon': 'longitude', 'lng': 'longitude', 'long': 'longitude',
        'watertemperature': 'water_temperature', 'temperature': 'water_temperature', 'temp': 'water_temperature',
        'ph': 'ph', 'tds': 'tds', 'do': 'do',
        'sampleanalysistype': 'sample_analysis_type',
        'isolationsource': 'isolation_source',
        'collectiondate': 'collection_date',
        'locationname': 'location_name', 'location': 'location_name', 'site': 'location_name',
        'collectedby': 'collected_by',
        'predictedsirprofile': 'predicted_sir_profile',
        'sequencename': 'sequence_name',
        'elementtype': 'element_type',
        'amrresistancegenes': 'amr_resistance_genes',
    }

    def coerce_cell(field, raw_value):
        value = str(raw_value).strip()
        if not value:
            return None
        if field in {'latitude', 'longitude', 'water_temperature', 'ph', 'tds', 'do'}:
            try:
                return float(value)
            except ValueError:
                return value
        return value

    def map_row_with_best_offset(parts, mapped_fields):
        if not parts or not mapped_fields:
            return {}

        def score_field(field, raw_value):
            value = str(raw_value).strip()
            if not value:
                return -0.5
            if field in {'latitude', 'longitude', 'water_temperature', 'ph', 'tds', 'do'}:
                try:
                    float(value)
                    return 2.0
                except ValueError:
                    return -1.0
            if field == 'sampleID':
                return 1.0 if re.search(r'[A-Za-z0-9]', value) else -0.5
            if field == 'collection_date':
                return 1.0 if re.match(r'^\d{4}-\d{2}-\d{2}$', value) else 0.2
            return 0.3

        max_offset = max(0, len(mapped_fields) - len(parts))
        best_offset = 0
        best_score = float('-inf')
        for offset in range(max_offset + 1):
            score = 0.0
            for index, part in enumerate(parts):
                field_index = index + offset
                if field_index >= len(mapped_fields):
                    break
                field_name = mapped_fields[field_index]
                if not field_name:
                    continue
                score += score_field(field_name, part)
            if score > best_score:
                best_score = score
                best_offset = offset

        sample = {}
        for index, part in enumerate(parts):
            field_index = index + best_offset
            if field_index >= len(mapped_fields):
                break
            field_name = mapped_fields[field_index]
            if not field_name:
                continue
            coerced = coerce_cell(field_name, part)
            if coerced is not None:
                sample[field_name] = coerced
        return sample

    # Primary table parser: use OCR coordinates to reconstruct rows and columns.
    positioned_lines = [line for line in ocr_lines if line.get('y_center') is not None]
    if len(positioned_lines) >= 6:
        valid_heights = sorted([line['height'] for line in positioned_lines if isinstance(line.get('height'), (int, float)) and line['height'] > 0])
        median_height = valid_heights[len(valid_heights) // 2] if valid_heights else 18
        row_tolerance = max(10.0, float(median_height) * 0.65)

        rows_grouped = []
        for line in sorted(positioned_lines, key=lambda entry: entry['y_center']):
            if not rows_grouped:
                rows_grouped.append([line])
                continue
            current_row = rows_grouped[-1]
            row_y_avg = sum(item['y_center'] for item in current_row) / len(current_row)
            if abs(line['y_center'] - row_y_avg) <= row_tolerance:
                current_row.append(line)
            else:
                rows_grouped.append([line])

        table_rows = []
        for row in rows_grouped:
            ordered_cells = [item['text'] for item in sorted(row, key=lambda entry: entry.get('x_center') or 0)]
            if ordered_cells:
                table_rows.append(ordered_cells)

        if table_rows:
            header_row_index = None
            mapped_fields = None
            for index, row_cells in enumerate(table_rows[:4]):
                norm = [normalize_token(cell) for cell in row_cells if str(cell).strip()]
                if not norm:
                    continue
                recognized = [token for token in norm if token in header_aliases or token in header_keywords]
                if len(recognized) >= max(3, int(len(norm) * 0.5)):
                    header_row_index = index
                    mapped_fields = [header_aliases.get(token, token if token in header_keywords else None) for token in norm]
                    break

            if header_row_index is not None and mapped_fields:
                parsed_samples = []
                for row_cells in table_rows[header_row_index + 1:]:
                    if not any(str(cell).strip() for cell in row_cells):
                        continue
                    sample = map_row_with_best_offset(row_cells, mapped_fields)
                    if sample and not any(str(v).strip().lower() in header_keywords for v in row_cells):
                        if 'sampleID' not in sample:
                            sample['sampleID'] = 'OCR_EXTRACTED_' + str(int(time() * 1000))
                        parsed_samples.append(sample)

                if parsed_samples:
                    return parsed_samples, low_confidence

    # Find candidate header line: one containing commas and many header tokens
    header_index = None
    for idx, line in enumerate(text_lines[:6]):
        if ',' in line or '\t' in line:
            tokens = re.split('[,\t;]', line)
            norm = [normalize_token(t) for t in tokens if t.strip()]
            mapped = [t for t in norm if t in header_aliases or t in header_keywords]
            if len(mapped) >= max(2, len(tokens) // 3):
                header_index = idx
                header_tokens = tokens
                break

    if header_index is not None:
        # Parse rows after header_index
        rows = []
        for row_text in text_lines[header_index+1:]:
            if not row_text.strip():
                continue
            if ',' in row_text or '\t' in row_text or ';' in row_text:
                parts = [p.strip() for p in re.split('[,\t;]', row_text)]
            else:
                # single-space separated fallback
                parts = [p.strip() for p in row_text.split()]
            if len(parts) == 0:
                continue
            rows.append(parts)

        # Build samples from rows using header_tokens mapping
        if rows:
            samples = []
            header_fields = [normalize_token(t) for t in header_tokens]
            mapped_fields = [header_aliases.get(h, (h if h in header_keywords else None)) for h in header_fields]
            for parts in rows:
                sample = {}
                for i, part in enumerate(parts):
                    if i < len(mapped_fields) and mapped_fields[i]:
                        field = mapped_fields[i]
                        try:
                            if field in {'latitude', 'longitude', 'water_temperature', 'ph', 'tds', 'do'}:
                                sample[field] = float(part)
                            else:
                                sample[field] = part
                        except Exception:
                            sample[field] = part
                    else:
                        # If no mapped field, attempt coordinate parse for first two columns
                        if i == 0 and len(parts) >= 2:
                            try:
                                lat = float(parts[0])
                                lon = float(parts[1])
                                sample['latitude'] = lat
                                sample['longitude'] = lon
                            except Exception:
                                pass

                if 'sampleID' not in sample:
                    sample['sampleID'] = 'OCR_EXTRACTED_' + str(int(time() * 1000))
                samples.append(sample)

            # Return early with parsed table samples
            return samples, low_confidence

    # Fallback: sometimes OCR splits header and rows across lines without commas on a single line.
    # Try to match a header line followed by at least one numeric CSV-like row in the full text.
    full_text = '\n'.join(text_lines)
    csv_block_match = re.search(r'([A-Za-z0-9_\-\s,;]+)\n\s*([-+0-9.,\s;]+)\n\s*([-+0-9.,\s;]+)', full_text)
    if csv_block_match:
        header_line = csv_block_match.group(1)
        row1 = csv_block_match.group(2)
        row2 = csv_block_match.group(3)
        tokens = re.split('[,;\t\n]', header_line)
        r1 = [p.strip() for p in re.split('[,;\t\n]', row1) if p.strip()]
        r2 = [p.strip() for p in re.split('[,;\t\n]', row2) if p.strip()]
        header_fields = [normalize_token(t) for t in tokens if t.strip()]
        mapped_fields = [header_aliases.get(h, (h if h in header_keywords else None)) for h in header_fields]
        rows = [r1, r2]
        samples = []
        for parts in rows:
            sample = {}
            for i, part in enumerate(parts):
                if i < len(mapped_fields) and mapped_fields[i]:
                    field = mapped_fields[i]
                    try:
                        if field in {'latitude', 'longitude', 'water_temperature', 'ph', 'tds', 'do'}:
                            sample[field] = float(part)
                        else:
                            sample[field] = part
                    except Exception:
                        sample[field] = part
            if 'sampleID' not in sample:
                sample['sampleID'] = 'OCR_EXTRACTED_' + str(int(time() * 1000))
            samples.append(sample)
        return samples, low_confidence
    
    # Simple heuristic parsing of sample data from OCR text
    # This is a baseline implementation - can be enhanced with ML/regex patterns
    for item in ocr_lines:
        text = item['text']
        conf = item['confidence']
        
        # Track low confidence fields
        if conf < confidence_threshold:
            field_key = 'text'  # Could improve with field detection
            if field_key not in low_confidence:
                low_confidence[field_key] = []
            low_confidence[field_key].append(text[:20])  # Truncate for brevity
        
        # Try to parse sample-like data
        # This is a simple heuristic; enhance based on your document format
        low_text = text.lower()
        norm_low_text = normalize_token(low_text)
        # Skip header-like lines that contain many header tokens
        header_hit_count = sum(1 for kw in header_keywords if kw in norm_low_text)
        if header_hit_count >= 2:
            # Likely a header row (e.g. "sampleID,latitude,longitude,...") - ignore
            continue

        if 'id' in low_text or 'sample' in low_text:
            # If this looks like an ID line but actually contains header tokens, skip
            id_match = re.search(r'(?i)(sample\s*id|id)\s*[:\-]?\s*(.+)$', text)
            sample_id_candidate = id_match.group(2).strip() if id_match else text
            normalized_candidate = normalize_token(sample_id_candidate.lower())
            if any(kw in normalized_candidate for kw in header_keywords):
                continue

            if current_sample and 'sampleID' in current_sample:
                samples.append(current_sample)

            current_sample = {'sampleID': sample_id_candidate, 'extracted_confidence': conf}
            continue

        label_patterns = [
            ('latitude', r'(?i)^\s*(latitude|lat)\s*[:\-]?\s*(.+)$'),
            ('longitude', r'(?i)^\s*(longitude|lon|lng|long)\s*[:\-]?\s*(.+)$'),
            ('water_temperature', r'(?i)^\s*(water\s*temperature|temperature|temp)\s*[:\-]?\s*(.+)$'),
            ('ph', r'(?i)^\s*(ph|p\.?h\.?)\s*[:\-]?\s*(.+)$'),
            ('tds', r'(?i)^\s*(tds|total\s*dissolved\s*solids)\s*[:\-]?\s*(.+)$'),
            ('do', r'(?i)^\s*(dissolved\s*oxygen|do)\s*[:\-]?\s*(.+)$'),
            ('sample_analysis_type', r'(?i)^\s*(sample\s*analysis\s*type|analysis\s*type)\s*[:\-]?\s*(.+)$'),
            ('isolation_source', r'(?i)^\s*(isolation\s*source|source)\s*[:\-]?\s*(.+)$'),
            ('collection_date', r'(?i)^\s*(collection\s*date|date)\s*[:\-]?\s*(.+)$'),
            ('location_name', r'(?i)^\s*(location\s*name|location|site)\s*[:\-]?\s*(.+)$'),
            ('collected_by', r'(?i)^\s*(collected\s*by|collector)\s*[:\-]?\s*(.+)$'),
            ('predicted_sir_profile', r'(?i)^\s*(predicted\s*sir\s*profile|sir\s*profile|sir)\s*[:\-]?\s*(.+)$'),
        ]

        matched_label = False
        for field_name, pattern in label_patterns:
            label_match = re.match(pattern, text)
            if label_match:
                assign_value(field_name, label_match.group(2), conf)
                matched_label = True
                break

        if matched_label:
            continue

        coordinate_match = re.search(r'(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)', text)
        if coordinate_match:
            assign_value('latitude', coordinate_match.group(1), conf)
            assign_value('longitude', coordinate_match.group(2), conf)
            continue

        elif ',' in text:  # Likely coordinates or measurements
            parts = text.split(',')
            if len(parts) >= 2:
                try:
                    if not current_sample:
                        current_sample = {}
                    
                    # Try to parse as coordinates
                    lat = float(parts[0].strip())
                    lon = float(parts[1].strip())
                    current_sample['latitude'] = lat
                    current_sample['longitude'] = lon
                except (ValueError, TypeError):
                    pass
    
    # Add final sample if exists
    if current_sample and ('sampleID' in current_sample or 'latitude' in current_sample or 'longitude' in current_sample):
        if 'sampleID' not in current_sample:
            current_sample['sampleID'] = 'OCR_EXTRACTED_' + str(int(time() * 1000))
        samples.append(current_sample)
    
    # If no structured data found, create a single sample with raw text
    if not samples:
        samples = [{
            'sampleID': 'OCR_EXTRACTED_' + str(int(time() * 1000)),
            'extracted_text_lines': len(ocr_lines),
            'raw_text_sample': ocr_lines[:3] if ocr_lines else []
        }]
    
    return samples, low_confidence

def process_request(request_data, confidence_threshold):
    """
    Process a single OCR extraction request.
    """
    try:
        request_id = request_data.get('requestId')
        image_b64 = request_data.get('imageBuffer')
        mime_type = request_data.get('mimeType')
        
        if not image_b64:
            return {
                'requestId': request_id,
                'success': False,
                'error': 'NO_IMAGE_DATA',
                'details': ['No image data in request']
            }
        
        # Decode image
        try:
            image_bytes = base64.b64decode(image_b64)
            from PIL import Image
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            image_array = np.array(image)
        except Exception as e:
            return {
                'requestId': request_id,
                'success': False,
                'error': 'INVALID_FORMAT',
                'details': [f'Failed to decode image: {str(e)}']
            }
        
        # Initialize PaddleOCR on first request
        if not paddle_initialized and not init_paddle():
            return {
                'requestId': request_id,
                'success': False,
                'error': 'DEPENDENCY_UNAVAILABLE',
                'details': ['PaddleOCR is not installed or failed to initialize']
            }

        if ocr_unavailable or ocr is None:
            return {
                'requestId': request_id,
                'success': False,
                'error': 'DEPENDENCY_UNAVAILABLE',
                'details': ['PaddleOCR is not installed or failed to initialize']
            }
        
        # Run OCR
        start_time = time()
        try:
            if hasattr(ocr, 'predict'):
                ocr_results = ocr.predict(image_array)
            else:
                ocr_results = ocr.ocr(image_array)
        except TypeError:
            # Fallback for older PaddleOCR interfaces.
            ocr_results = ocr.ocr(image_array)
        processing_time = int((time() - start_time) * 1000)
        
        # Check if any text was found
        if not ocr_results or not any(ocr_results):
            return {
                'requestId': request_id,
                'success': False,
                'error': 'NO_TEXT_FOUND',
                'details': ['No readable text detected in image']
            }
        
        # Extract samples from OCR results
        samples, low_confidence = extract_samples_from_ocr(ocr_results, confidence_threshold)
        
        # Build response
        return {
            'requestId': request_id,
            'success': True,
            'samples': samples,
            'lowConfidenceFields': low_confidence,
            'warnings': [],
            'validationErrors': [],
            'processingTimeMs': processing_time
        }
    
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        return {
            'requestId': request_data.get('requestId'),
            'success': False,
            'error': 'PROCESSING_ERROR',
            'details': [str(e)]
        }

def main():
    """Main worker loop - read JSON from stdin, process, write to stdout"""
    print(json.dumps({
        "type": "system",
        "message": "OCR Worker started and ready"
    }), file=sys.stderr)
    
    try:
        while True:
            try:
                line = sys.stdin.readline()
                if not line:
                    # EOF on stdin, exit gracefully
                    print(json.dumps({
                        "type": "system",
                        "message": "EOF received, exiting"
                    }), file=sys.stderr)
                    sys.exit(0)
                
                line = line.strip()
                if not line:
                    continue
                
                # Parse request
                request_data = json.loads(line)
                confidence_threshold = request_data.get('confidenceThreshold', 0.75)
                
                # Process request
                response = process_request(request_data, confidence_threshold)
                
                # Send response on stdout
                print(json.dumps(response))
                sys.stdout.flush()
            
            except json.JSONDecodeError as e:
                print(json.dumps({
                    "type": "error",
                    "message": f"Invalid JSON: {str(e)}"
                }), file=sys.stderr)
            except Exception as e:
                print(json.dumps({
                    "type": "error",
                    "message": f"Error processing request: {str(e)}",
                    "traceback": traceback.format_exc()
                }), file=sys.stderr)
    
    except KeyboardInterrupt:
        print(json.dumps({
            "type": "system",
            "message": "Worker interrupted"
        }), file=sys.stderr)
        sys.exit(0)

if __name__ == '__main__':
    main()
