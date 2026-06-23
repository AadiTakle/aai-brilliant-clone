import { validateAllLessons } from '../src/content/validate'

const report = validateAllLessons()

for (const result of report.results) {
  if (result.ok) {
    console.log(`✓ ${result.id}`)
  } else {
    console.error(`✗ ${result.id}\n${result.error}`)
  }
}

if (!report.ok) {
  console.error('\nContent validation failed.')
  process.exit(1)
}

console.log(`\nAll ${report.results.length} lesson(s) valid.`)
