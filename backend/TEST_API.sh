# IMY772 API Test Commands
# Use these curl commands to test the CRUD operations

BASE_URL="http://localhost:3000"

# ─── Samples Tests ──────────────────────────────────────────────────────────

# Get all samples
curl -X GET "$BASE_URL/api/samples"

# Get sample by ID (adjust sampleID as needed)
curl -X GET "$BASE_URL/api/samples/1"

# Create a new sample
curl -X POST "$BASE_URL/api/samples" \
  -H "Content-Type: application/json" \
  -d '{
    "water_temperature": 21.0,
    "ph": 7.3,
    "tds": 400.0,
    "do": 8.5,
    "sample_analysis_type": "Metagenomic",
    "isolation_source": "Test water source",
    "collection_date": "2026-04-10",
    "location_name": "Test Location",
    "latitude": -25.5,
    "longitude": 28.5,
    "collected_by": "Test User",
    "predicted_sir_profile": "Susceptible"
  }'

# Update a sample (adjust sampleID as needed)
curl -X PUT "$BASE_URL/api/samples/1" \
  -H "Content-Type: application/json" \
  -d '{
    "predicted_sir_profile": "Intermediate",
    "collected_by": "Updated User Name"
  }'

# Delete a sample (adjust sampleID as needed)
curl -X DELETE "$BASE_URL/api/samples/1"

# ─── Metagenomic Tests ─────────────────────────────────────────────────────

# Get all metagenomic records
curl -X GET "$BASE_URL/api/metagenomic"

# Get metagenomic records by sample ID
curl -X GET "$BASE_URL/api/metagenomic/sample/1"

# Create metagenomic record
curl -X POST "$BASE_URL/api/metagenomic" \
  -H "Content-Type: application/json" \
  -d '{
    "sampleID": 1,
    "sequence_name": "TEST_SEQ_001",
    "element_type": "Prokaryotic",
    "class": "Bacilli",
    "subclass": "Bacillaceae"
  }'

# Update metagenomic record (adjust ID as needed)
curl -X PUT "$BASE_URL/api/metagenomic/1" \
  -H "Content-Type: application/json" \
  -d '{
    "sequence_name": "UPDATED_SEQ_001"
  }'

# Delete metagenomic record (adjust ID as needed)
curl -X DELETE "$BASE_URL/api/metagenomic/1"

# ─── WGS Tests ────────────────────────────────────────────────────────────

# Get all WGS records
curl -X GET "$BASE_URL/api/wgs"

# Get WGS records by sample ID
curl -X GET "$BASE_URL/api/wgs/sample/1"

# Get WGS records by isolate ID
curl -X GET "$BASE_URL/api/wgs/isolate/1001"

# Create WGS record
curl -X POST "$BASE_URL/api/wgs" \
  -H "Content-Type: application/json" \
  -d '{
    "sampleID": 1,
    "isolateID": 2001,
    "organism": "Test organism"
  }'

# Update WGS record (adjust ID as needed)
curl -X PUT "$BASE_URL/api/wgs/1" \
  -H "Content-Type: application/json" \
  -d '{
    "organism": "Updated organism"
  }'

# Delete WGS record (adjust ID as needed)
curl -X DELETE "$BASE_URL/api/wgs/1"

# ─── AMR Resistance Genes Tests ────────────────────────────────────────────

# Get all AMR resistance genes
curl -X GET "$BASE_URL/api/amr-resistance-genes"

# Get AMR genes by sample ID
curl -X GET "$BASE_URL/api/amr-resistance-genes/sample/1"

# Create AMR resistance gene
curl -X POST "$BASE_URL/api/amr-resistance-genes" \
  -H "Content-Type: application/json" \
  -d '{
    "sampleID": 1,
    "geneSymbol": "testGene123"
  }'

# Update AMR gene (adjust ID as needed)
curl -X PUT "$BASE_URL/api/amr-resistance-genes/1" \
  -H "Content-Type: application/json" \
  -d '{
    "geneSymbol": "updatedGene123"
  }'

# Delete AMR gene (adjust ID as needed)
curl -X DELETE "$BASE_URL/api/amr-resistance-genes/1"

# ─── Virulence Genes Tests ────────────────────────────────────────────────

# Get all virulence genes
curl -X GET "$BASE_URL/api/virulence-genes"

# Get virulence genes by isolate ID
curl -X GET "$BASE_URL/api/virulence-genes/isolate/1001"

# Create virulence gene
curl -X POST "$BASE_URL/api/virulence-genes" \
  -H "Content-Type: application/json" \
  -d '{
    "isolateID": 1001,
    "geneSymbol": "testVirGene123"
  }'

# Update virulence gene (adjust ID as needed)
curl -X PUT "$BASE_URL/api/virulence-genes/1" \
  -H "Content-Type: application/json" \
  -d '{
    "geneSymbol": "updatedVirGene123"
  }'

# Delete virulence gene (adjust ID as needed)
curl -X DELETE "$BASE_URL/api/virulence-genes/1"
