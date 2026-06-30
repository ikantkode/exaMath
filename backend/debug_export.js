const { XMLParser } = require('fast-xml-parser');
const { create } = require('xmlbuilder2');
const fs = require('fs');

const xml = fs.readFileSync('/tmp/PS307k-4.xml', 'utf-8');
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
const obj = parser.parse(xml);

// Check for problematic values
const apiObjects = obj?.APIBusinessObjects;
const project = apiObjects?.Project;
const activities = project?.Activity || [];
const activityList = Array.isArray(activities) ? activities : activities ? [activities] : [];

const firstActivity = activityList[0];

// Check all values that might cause issues
for (const [key, value] of Object.entries(firstActivity)) {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    if (Object.keys(value).length <= 2) {
      console.log('Potential issue - key:', key, 'value:', JSON.stringify(value));
    }
  }
}

console.log('\n--- Trying to export original object ---');
try {
  const result = create(obj).end({ prettyPrint: false });
  console.log('Export succeeded, length:', result.length);
} catch (e) {
  console.log('Export failed:', e.message);
}

console.log('\n--- Trying to export with sanitize=true ---');
try {
  const result = create(obj).end({ prettyPrint: false, sanitize: true });
  console.log('Export succeeded with sanitize, length:', result.length);
} catch (e) {
  console.log('Export failed with sanitize:', e.message);
}
