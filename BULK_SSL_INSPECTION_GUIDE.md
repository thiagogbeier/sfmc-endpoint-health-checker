# Bulk SSL Inspection Sample Files

This directory contains sample files to test the Bulk SSL Inspection feature:

## Sample Files Included:

### 📄 `sample-urls.txt`
- Plain text format with one URL per line
- Supports comments (lines starting with #)
- Easy to create and edit manually

### 📊 `sample-urls.csv` 
- CSV format with URLs in the first column
- Additional columns for metadata (description, priority)
- Compatible with Excel and Google Sheets

### 🔧 `sample-urls.json`
- JSON format with URLs array
- Structured data with metadata
- Programmatically generated format

## How to Use:

1. Navigate to the **📋 Bulk SSL Inspection** tab
2. Click "Choose File" and select one of the sample files
3. Review the uploaded URLs list
4. Click "🚀 Run Bulk Inspection" to start the batch process
5. View results in the detailed table
6. Download results as CSV for further analysis

## File Format Requirements:

### Text Files (.txt)
```
# Comments start with #
google.com
github.com
https://example.com
```

### CSV Files (.csv)
```
URL,Description,Priority
google.com,Google Search,High
github.com,GitHub Platform,Medium
```

### JSON Files (.json)
```json
{
  "urls": [
    "google.com",
    "github.com",
    "example.com"
  ]
}
```

## Features:

- ✅ **Auto-protocol detection**: Automatically adds `https://` if not specified
- ✅ **URL validation**: Filters out invalid URLs
- ✅ **Progress tracking**: Real-time progress bar during bulk processing
- ✅ **Detailed results**: Status, connectivity, response times, certificate details
- ✅ **Export functionality**: Download results as CSV
- ✅ **Summary statistics**: Visual breakdown of valid/warning/error certificates

## Tips:

- Keep file sizes reasonable (< 100 URLs) for optimal performance
- Use descriptive filenames for better organization
- Test with a small sample first before processing large batches
- Check the preview to ensure URLs were parsed correctly
