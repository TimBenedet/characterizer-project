module.exports.up = async function(knex) {
  const characterExists = await knex.schema.hasTable('Characters')
  if (!characterExists) {
    await knex.schema.createTable('Characters', function(table) {
      table.string('name')
      table.increments('id').primary()
      table.timestamps(false, true)
    })
  }

  const valuesExists = await knex.schema.hasTable('Values')
  if (!valuesExists) {
    await knex.schema.createTable('Values', function(table) {
      table.string('name')
      table.increments('id').primary()
      table.string('uuid')
      table.timestamps(false, true)
    })
  }

  const collectionsExists = await knex.schema.hasTable('Collections')
  if (!collectionsExists) {
    await knex.schema.createTable('Collections', function(table) {
      table.string('name')
      table.increments('id').primary()
      table.timestamps(false, true)
    })
  }

  const characterValuesExists = await knex.schema.hasTable('CharacterValues')
  if (!characterValuesExists) {
    await knex.schema.createTable('CharacterValues', function(table) {
      table.increments('id').primary()
      table.integer('characterID').references('id').inTable('Characters')
      table.integer('valueID').references('id').inTable('Values')
      table.integer('wins')
      table.integer('losses')
      table.integer('battleCount')
      table.float('score')
      table.timestamps(false, true)
    })
  }

  const valuesCollectionsExists = await knex.schema.hasTable('ValuesCollections')
  if (!valuesCollectionsExists) {
    await knex.schema.createTable('ValuesCollections', function(table) {
      table.increments('id').primary()
      table.string('name')
      table.integer('valueID').references('id').inTable('Values')
      table.timestamps(false, true)
    })
  }

  const valuesBattleOutcomesExists = await knex.schema.hasTable('ValuesBattleOutcomes')
  if (!valuesBattleOutcomesExists) {
    await knex.schema.createTable('ValuesBattleOutcomes', function(table) {
      table.increments('id').primary()
      table.integer('characterID').references('id').inTable('Characters')
      table.integer('loser').references('id').inTable('Values')
      table.integer('winner').references('id').inTable('Values')
      table.timestamps(false, true)
    })
  }

  const valuesBattleFavoritesExists = await knex.schema.hasTable('ValuesBattleFavorites')
  if (!valuesBattleFavoritesExists) {
    await knex.schema.createTable('ValuesBattleFavorites', function(table) {
      table.increments('id').primary()
      table.integer('characterID').references('id').inTable('Characters')
      table.integer('value1ID').references('id').inTable('Values')
      table.integer('value2ID').references('id').inTable('Values')
      table.timestamps(false, true)
    })
  }
}

module.exports.down = async function(knex) {
  // Drop tables in reverse order due to foreign key constraints
  await knex.schema.dropTableIfExists('ValuesBattleFavorites')
  await knex.schema.dropTableIfExists('ValuesBattleOutcomes')
  await knex.schema.dropTableIfExists('ValuesCollections')
  await knex.schema.dropTableIfExists('CharacterValues')
  await knex.schema.dropTableIfExists('Collections')
  await knex.schema.dropTableIfExists('Values')
  await knex.schema.dropTableIfExists('Characters')
}
