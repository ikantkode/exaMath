const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');

const xml = fs.readFileSync('/tmp/exported.xml', 'utf-8');
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
const obj = parser.parse(xml);

const apiObjects = obj?.APIBusinessObjects;
const project = apiObjects?.Project;
const activities = project?.Activity || [];
const activityList = Array.isArray(activities) ? activities : activities ? [activities] : [];

const mobilization = activityList.find(a => a.Id === 200);
console.log('Activity 200 (Mobilization) in export:');
console.log('  Id:', mobilization?.Id);
console.log('  Name:', mobilization?.Name);
console.log('  PhysicalPercentComplete:', mobilization?.PhysicalPercentComplete);
console.log('  ActualStartDate:', mobilization?.ActualStartDate);
console.log('  RemainingDuration:', mobilization?.RemainingDuration);

// Check original file
console.log('\nOriginal file Activity 200:');
const origXml = fs.readFileSync('/tmp/PS307k-4.xml', 'utf-8');
const origObj = parser.parse(origXml);
const origActivities = origObj?.APIBusinessObjects?.Project?.Activity || [];
const origList = Array.isArray(origActivities) ? origActivities : origActivities ? [origActivities] : [];
const origMobilization = origList.find(a => a.Id === 200);
console.log('  PhysicalPercentComplete:', origMobilization?.PhysicalPercentComplete);
console.log('  ActualStartDate:', origMobilization?.ActualStartDate);
