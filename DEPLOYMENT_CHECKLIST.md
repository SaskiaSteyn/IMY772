# Bulk Upload Feature - Deployment Checklist

## ✅ Implementation Complete

### Backend Implementation

- [x] Installed dependencies (multer, csv-parse)
- [x] Created file upload route (`/api/bulk-upload`)
- [x] Implemented file parsing utilities (CSV and JSON)
- [x] Added data validation logic
- [x] Integrated database insertion with Prisma
- [x] Added error handling and logging
- [x] Verified syntax of all files
- [x] Registered route in server.js

### Frontend Implementation

- [x] Created BulkUploadModal component
- [x] Styled upload modal with SCSS module
- [x] Integrated modal into captured-data page
- [x] Added modal trigger button
- [x] Implemented file selection handler
- [x] Added upload state management
- [x] Implemented success/failure UI
- [x] Connected modal props correctly

### Documentation

- [x] Created BULK_UPLOAD.md with full API documentation
- [x] Created FORMAT_GUIDE.md with quick reference
- [x] Created IMPLEMENTATION_SUMMARY.md
- [x] Created samples-template.json
- [x] Created samples-template.csv

## 🚀 Deployment Steps

1. **Install Dependencies**

    ```bash
    cd backend
    npm install
    ```

    Dependencies should already be installed if running `npm install multer csv-parse`

2. **Update Environment Variables** (if needed)
    - No new environment variables required

3. **Run Database Migrations**

    ```bash
    npm run prisma:migrate:deploy
    ```

    (No new migrations needed - uses existing schema)

4. **Test the Endpoint**

    ```bash
    # Using curl with test JSON file
    curl -X POST http://localhost:3000/api/bulk-upload \
      -F "file=@samples-template.json"
    ```

5. **Verify Frontend**
    - Start frontend development server
    - Navigate to "Captured Data" page
    - Should see "Upload Bulk Data" button
    - Click to test modal opening

## 📋 Testing Checklist

### Manual Testing

- [ ] Upload JSON file with single sample
- [ ] Upload JSON file with multiple samples
- [ ] Upload JSON with metagenomic data
- [ ] Upload CSV file with data
- [ ] Test error handling with invalid latitude/longitude
- [ ] Test with invalid date format
- [ ] Test with missing required fields
- [ ] Test with oversized file (>10MB)
- [ ] Test with invalid file type
- [ ] Verify data appears in database
- [ ] Verify modal closes on success
- [ ] Verify error messages display properly

### Edge Cases

- [ ] File with no samples
- [ ] File with duplicate sampleIDs (should group correctly)
- [ ] File with special characters in strings
- [ ] File with empty optional fields
- [ ] CSV with missing columns (should skip)
- [ ] JSON with extra fields (should ignore)
- [ ] Very large file (close to 10MB limit)

## 🔄 Post-Deployment

1. **Monitor Logs**
    - Watch backend logs for upload errors
    - Check database for inserted records

2. **User Training**
    - Share FORMAT_GUIDE.md with users
    - Share template files as examples
    - Provide BULK_UPLOAD.md as reference

3. **Gather Feedback**
    - Ask users about UX
    - Note any common file format issues
    - Collect requests for enhancements

## 🐛 Troubleshooting

### Issue: 400 Bad Request on upload

- Check file format matches spec
- Verify latitude/longitude are present and numeric
- Check file size is under 10MB

### Issue: 500 Server Error

- Check backend logs for detailed error
- Verify database connection
- Ensure multer and csv-parse are installed

### Issue: Modal doesn't open

- Verify BulkUploadModal import is correct
- Check `bulkUploadModalOpened` state exists
- Verify button onClick handler is set

### Issue: Data not appearing in database

- Check upload response for failure messages
- Verify sample validation passed
- Check Prisma connection

## 📊 Performance Notes

- Current implementation: ~1,000 samples per 10MB
- Database inserts are sequential per sample
- No batch transactions (individual samples can fail independently)
- Consider caching parsed file in state if re-uploading

## 🔐 Security Considerations

- [x] File size limited to 10MB
- [x] File type validation (CSV, JSON only)
- [x] Input data validation
- [x] Error messages don't expose system details
- [ ] Consider adding authentication checks (optional)
- [ ] Consider rate limiting (optional)
- [ ] Consider file scanning (optional)

## 📝 Version Information

- Created: April 12, 2026
- Node.js dependencies:
    - multer: ^1.4.0
    - csv-parse: ^6.2.1
- React dependencies: (none new)
- Browser compatibility: All modern browsers

## 🎯 Success Criteria

All of the following should be true:

- ✓ Backend accepts file uploads at `/api/bulk-upload`
- ✓ CSV and JSON files can be uploaded
- ✓ Data is parsed and validated correctly
- ✓ Samples are created in database
- ✓ Metagenomic data is linked to samples
- ✓ AMR resistance genes are created
- ✓ Frontend modal provides user feedback
- ✓ Errors are reported with detail
- ✓ Documentation is comprehensive

## 📞 Support

For issues or questions:

1. Check FORMAT_GUIDE.md for file format help
2. Check BULK_UPLOAD.md for API details
3. Review sample template files for examples
4. Check backend logs for error details
