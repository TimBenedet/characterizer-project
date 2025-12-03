const fs = require('fs')
const { randomUUID } = require('crypto')

async function seedDB(knex, properties) {
  const values = fs.readFileSync(properties.valuesSeedDataPath).toString().split("\n")

  for (const value of values) {
    if (!value || value.trim() === '') continue

    const result = await knex('Values').where({ name: value }).select('id')

    // Check for existing value
    if (!result || result.length === 0) {
      await knex('Values').insert({ name: value, uuid: generateUUID() })
    }
  }
}

function generateUUID() {
  return randomUUID()
}

module.exports = {
  seedDB
}
