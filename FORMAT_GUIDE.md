# Quick Format Reference

## JSON Format (Recommended)

Use this structure for your JSON file:

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
                    "sequence_name": "seq_001",
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

### JSON Notes:

- Root must be an object with `samples` array
- Each sample has latitude and longitude (required)
- `metagenomic` is an optional array
- `amr_resistance_genes` is an optional array of strings
- Dates should be ISO 8601 format (YYYY-MM-DD)

---

## CSV Format

Use this structure for your CSV file:

```csv
sampleID,latitude,longitude,water_temperature,ph,tds,do,sample_analysis_type,isolation_source,collection_date,location_name,collected_by,predicted_sir_profile,sequence_name,element_type,class,subclass,amr_resistance_genes
1,−25.7479,28.2293,24.5,7.2,98.5,8.2,Metagenomic,River water,2025-11-15,University of Pretoria,Riley Carter,Susceptible,seq_001,transposon,Class A,Serine carbapenemase,"ampC, blaTEM"
1,−25.7479,28.2293,24.5,7.2,98.5,8.2,Metagenomic,River water,2025-11-15,University of Pretoria,Riley Carter,Susceptible,seq_002,insertion_sequence,Class C,Cephalosporinase,cephalosporinase
2,−25.7500,28.2310,23.8,6.9,105.0,7.5,Metagenomic,Dam,2025-11-16,Pretoria River,Harry Smith,Intermediate,seq_003,plasmid,Class B,Metallo,blaVIM
```

### CSV Notes:

- Header row is required with exact column names
- Same `sampleID` on multiple rows = multiple metagenomic sequences for one sample
- `amr_resistance_genes` should be comma-separated (no quotes needed unless it contains commas)
- If no metagenomic data, leave those columns empty
- Dates must be YYYY-MM-DD format

---

## Minimal Example (No Metagenomic Data)

### JSON:

```json
{
    "samples": [
        {
            "latitude": -25.7479,
            "longitude": 28.2293,
            "water_temperature": 24.5,
            "ph": 7.2
        }
    ]
}
```

### CSV:

```csv
sampleID,latitude,longitude,water_temperature,ph
1,−25.7479,28.2293,24.5,7.2
```

---

## Field Reference

| Field                 | Type              | Required | Example                                      |
| --------------------- | ----------------- | -------- | -------------------------------------------- |
| latitude              | decimal           | YES      | -25.7479                                     |
| longitude             | decimal           | YES      | 28.2293                                      |
| water_temperature     | decimal           | NO       | 24.5                                         |
| ph                    | decimal           | NO       | 7.2                                          |
| tds                   | decimal           | NO       | 98.5                                         |
| do                    | decimal           | NO       | 8.2                                          |
| sample_analysis_type  | string            | NO       | "Metagenomic"                                |
| isolation_source      | string            | NO       | "River water"                                |
| collection_date       | date (YYYY-MM-DD) | NO       | "2025-11-15"                                 |
| location_name         | string            | NO       | "University of Pretoria"                     |
| collected_by          | string            | NO       | "Riley Carter"                               |
| predicted_sir_profile | string            | NO       | "Susceptible" / "Intermediate" / "Resistant" |
| sequence_name         | string            | NO\*     | "seq_001"                                    |
| element_type          | string            | NO       | "transposon"                                 |
| class                 | string            | NO       | "Class A"                                    |
| subclass              | string            | NO       | "Serine carbapenemase"                       |
| amr_resistance_genes  | array/CSV         | NO       | ["ampC", "blaTEM"]                           |

\*Required if including metagenomic data

---

## Common Issues

### Issue: "CSV must contain sampleID column"

- **Fix:** Add `sampleID` column to your CSV (can be numbers 1, 2, 3...)

### Issue: "latitude must be numeric"

- **Fix:** Ensure latitude/longitude are numbers, not text strings

### Issue: "dates not recognized"

- **Fix:** Use ISO 8601 format: YYYY-MM-DD (e.g., 2025-11-15)

### Issue: "predicted_sir_profile must be one of..."

- **Fix:** Only use: "Susceptible", "Intermediate", or "Resistant"

### Issue: CSV has multiple rows per sample

- **Fix:** This is correct! Use the same sampleID for multiple metagenomic sequences
