# OCR Worker - PaddleOCR Backend

## Overview

The OCR worker is a Python child process that extracts text and structured data from images using PaddleOCR. It communicates with the Node.js backend via JSON over stdin/stdout.

## Architecture

- **Node.js Backend** (parent process): Manages worker lifecycle, request queuing, timeouts, error mapping
- **Python Worker** (child process): Initializes PaddleOCR, processes images, returns normalized JSON
- **Protocol**: JSON request/response over stdin/stdout

## Setup

### Local Development

1. Install Python 3.11+
   ```bash
   python3 --version  # Should be 3.11 or higher
   ```

2. Install dependencies
   ```bash
   pip install -r requirements-ocr.txt
   ```

3. Test the worker directly
   ```bash
   python3 ocr-worker.py < test-request.json > output.json
   ```

If your OCR environment uses a specific Python binary, set `OCR_WORKER_PYTHON_BIN` or `OCR_PYTHON_BIN` before starting the backend.

### Docker Deployment

The `docker-compose.yml` automatically installs Python and dependencies when the backend container starts.

## Request/Response Protocol

### Request (stdin)

```json
{
  "requestId": "uuid-string",
  "imageBuffer": "base64-encoded-image-bytes",
  "mimeType": "image/png|image/jpeg|image/webp",
  "confidenceThreshold": 0.75
}
```

### Success Response (stdout)

```json
{
  "requestId": "uuid-string",
  "success": true,
  "samples": [
    {
      "sampleID": "OCR_EXTRACTED_1234567890",
      "latitude": -25.7479,
      "longitude": 28.2293,
      "water_temperature": 24.5,
      "ph": 7.2
    }
  ],
  "lowConfidenceFields": {
    "water_temperature": ["OCR_EXTRACTED_1234567890"],
    "ph": []
  },
  "warnings": ["Some confidence values below threshold"],
  "validationErrors": [],
  "processingTimeMs": 1234
}
```

### Error Response (stdout)

```json
{
  "requestId": "uuid-string",
  "success": false,
  "error": "NO_TEXT_FOUND|INVALID_FORMAT|PROCESSING_ERROR",
  "details": ["Specific error message"]
}
```

## Configuration

Environment variables (default values in parentheses):

- `OCR_WORKER_PYTHON_BIN` - Python interpreter used to spawn the OCR worker (`python3`)
- `OCR_WORKER_TIMEOUT_MS` - Timeout per request in milliseconds (30000)
- `OCR_CONFIDENCE_THRESHOLD` - Confidence threshold for field extraction (0.75)
- `OCR_PADDLE_LANGUAGES` - Comma-separated list of languages (en)

## Testing

### Test Request File (test-request.json)

```bash
# Create a test image and encode to base64
python3 -c "
import base64
from PIL import Image, ImageDraw

# Create a simple test image with text
img = Image.new('RGB', (300, 150), color='white')
draw = ImageDraw.Draw(img)
draw.text((10, 10), 'Sample -25.7479 28.2293', fill='black')
img.save('test.png')

# Read and encode
with open('test.png', 'rb') as f:
    encoded = base64.b64encode(f.read()).decode()
    print(f'{{\"requestId\": \"test-1\", \"imageBuffer\": \"{encoded}\", \"mimeType\": \"image/png\", \"confidenceThreshold\": 0.75}}')
" > test-request.json
```

### Run Worker with Test

```bash
python3 ocr-worker.py < test-request.json
```

### Expected Output

The worker should output a JSON response with the extracted text parsed into sample fields.

## Performance Notes

- **Model Loading**: ~500ms-1s on first request (model cached after initialization)
- **Processing Time**: 500ms-3s per image depending on image size and complexity
- **Memory Usage**: ~200-300MB for model + processing overhead
- **Single Worker**: Processes one request at a time (queue managed by Node backend)

## Troubleshooting

### Worker won't start

- Check Python version: `python3 --version` (must be 3.11+)
- Check dependencies: `pip list | grep paddle`
- Check worker file permissions: `chmod +x backend/ocr-worker.py`

### Timeout errors

- Increase `OCR_WORKER_TIMEOUT_MS` environment variable
- Check image complexity (very large/complex images take longer)
- Monitor system resources (disk I/O, memory, CPU)

### Low confidence fields

- Adjust `OCR_CONFIDENCE_THRESHOLD` environment variable
- Use clearer image scans with better contrast
- Ensure table/form layout is regular and clear

### Out of memory

- The PaddleOCR model requires ~200MB memory
- Check available system memory
- Consider running on a machine with >2GB RAM

## Development

### Modifying the Worker

1. Edit `ocr-worker.py`
2. Test locally with test images
3. Check logs on stderr for debugging
4. Update worker manager timeout if processing time increases

### Adding Languages

Update `OCR_PADDLE_LANGUAGES` environment variable with additional language codes (e.g., `en,fr,de`).

Supported languages: https://github.com/PaddleOCR/PaddleOCR/blob/release/2.7/doc/doc_en/multi_languages.md

### Improving Text Extraction

The current implementation uses simple heuristic parsing. For better results:

1. Implement regex patterns for field detection
2. Add template matching for known table formats
3. Use confidence scoring for field matching
4. Implement post-processing for common errors

## References

- PaddleOCR: https://github.com/PaddleOCR/PaddleOCR
- PaddleOCR Python API: https://paddleocr.readthedocs.io/
- Supported Models: https://github.com/PaddleOCR/PaddleOCR/blob/release/2.7/doc/doc_en/models_list.md
