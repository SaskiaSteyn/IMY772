# Bulk Upload Feature

## Overview

The bulk upload feature allows users to upload multiple samples and their associated metagenomic data in a single operation. The backend handles all data parsing, validation, and database insertion automatically.

## Supported File Formats

### JSON Format

Expected structure:

```json
{
    "samples": [
        {
            "latitude": -25.7479,
            "longitude": 28.2293,
            "water_temperature": 24.5,
            "ph": 7.2,
            "tds": 98.5,
            "do": 8.2,
            "sample_analysis_type": "Metagenomic",
            "isolation_source": "River water",
            "collection_date": "2025-11-15",
            "location_name": "University of Pretoria",
            "collected_by": "Riley Carter",
            "predicted_sir_profile": "Susceptible",
            "metagenomic": [
                {
                    "sequence_name": "sample_001_seq_1",
                    "element_type": "transposon",
                    "class": "Class A",
                    "subclass": "Serine carbapenemase",
                    "amr_resistance_genes": ["ampC", "blaTEM"]
                }
            ]
        }
    ]
}
```

### CSV Format

The CSV format should have the following columns, with metagenomic data repeated for each sequence:

```
sampleID,latitude,longitude,water_temperature,ph,tds,do,sample_analysis_type,isolation_source,collection_date,location_name,collected_by,predicted_sir_profile,sequence_name,element_type,class,subclass,amr_resistance_genes
```

**Important Notes:**

- Multiple rows with the same `sampleID` will be grouped into a single sample with multiple metagenomic records
- The `amr_resistance_genes` column should contain comma-separated gene names
- Omit the sequence columns if your samples don't have metagenomic data

## Required Fields

- `latitude` (decimal) - **Required**
- `longitude` (decimal) - **Required**

## Optional Fields

- `water_temperature` (decimal)
- `ph` (decimal)
- `tds` (decimal)
- `do` (decimal - dissolved oxygen)
- `sample_analysis_type` (string)
- `isolation_source` (string)
- `collection_date` (ISO 8601 date format: YYYY-MM-DD)
- `location_name` (string)
- `collected_by` (string)
- `predicted_sir_profile` (string) - Must be one of: "Susceptible", "Intermediate", "Resistant"

## Metagenomic Data (Optional)

If including metagenomic data:

- `sequence_name` (string) - **Required if metagenomic data is present**
- `element_type` (string)
- `class` (string)
- `subclass` (string)
- `amr_resistance_genes` (array of strings or comma-separated string)

## API Endpoint

**POST** `/api/bulk-upload`

### Request

- Method: `POST`
- Content-Type: `multipart/form-data`
- Form field name: `file`
- Allowed file types: `.csv`, `.json`
- Max file size: 10MB

### Response

On success (HTTP 200):

```json
{
    "message": "File processed successfully",
    "results": {
        "totalSamples": 2,
        "successCount": 2,
        "failureCount": 0,
        "errors": [],
        "sampleIDs": [1, 2]
    }
}
```

On validation error (HTTP 400):

```json
{
    "error": "Validation failed",
    "details": ["Sample 0: missing latitude", "Sample 1: ph must be numeric"]
}
```

## Usage

1. Navigate to the "Captured Data" page
2. Click "Upload Bulk Data" button
3. Select a CSV or JSON file
4. Review the file details
5. Click "Upload"
6. View the results summary

## Template Files

Example files are provided in the backend directory:

- `samples-template.json` - JSON format example
- `samples-template.csv` - CSV format example

Use these as reference when preparing your files.

## Error Handling

The upload system validates:

- Required fields presence
- Numeric field types
- Date format (ISO 8601)
- SIR profile values
- Latitude/longitude presence

Failed samples are reported with detailed error messages, while successful samples are still inserted into the database.

## Backend Implementation

### Files

- **Route:** `backend/routes/bulk-upload.routes.js`
- **Parser:** `backend/lib/file-parser.js`
- **Dependencies:** `multer`, `csv-parse`

### Parser Functions

#### `parseCSVFile(fileContent)`

Parses CSV content and converts to nested JSON structure with metagenomic grouping.

#### `parseJSONFile(fileContent)`

Parses JSON content and validates structure. Supports both `{ samples: [...] }` and direct array formats.

#### `validateSamples(samples)`

Validates all samples and returns detailed error list if validation fails.

## Frontend Implementation

### Files

- **Component:** `frontend/src/components/captured-data-components/bulk-upload-modal.jsx`
- **Styles:** `frontend/src/components/captured-data-components/bulk-upload-modal.module.scss`
- **Integration:** `frontend/src/pages/captured-data/captured-data.jsx`

### Component Props

- `isOpen` (boolean) - Modal visibility state
- `onClose` (function) - Called when modal should close
- `onUploadSuccess` (function) - Called after successful upload

## Notes

- The backend automatically creates related AMR resistance gene records
- Duplicate metagenomic sequences are allowed for the same sample
- Latitude and longitude are required for all samples
- Dates should be in ISO 8601 format (YYYY-MM-DD)
