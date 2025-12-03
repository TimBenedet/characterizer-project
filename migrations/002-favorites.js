module.exports.up = async function(knex) {
  const valueComparisonFavoritesExists = await knex.schema.hasTable('ValueComparisonFavorites')
  if (!valueComparisonFavoritesExists) {
    await knex.schema.createTable('ValueComparisonFavorites', function(table) {
      table.integer('character1ID').references('id').inTable('Characters')
      table.integer('value1ID').references('id').inTable('Values')
      table.integer('character2ID').references('id').inTable('Characters')
      table.integer('value2ID').references('id').inTable('Values')
      table.timestamps(false, true)
      table.increments('id').primary()
    })
  }

  const characterValueFavoritesExists = await knex.schema.hasTable('CharacterValueFavorites')
  if (!characterValueFavoritesExists) {
    await knex.schema.createTable('CharacterValueFavorites', function(table) {
      table.integer('characterID').references('id').inTable('Characters')
      table.integer('valueID').references('id').inTable('Values')
      table.timestamps(false, true)
      table.increments('id').primary()
    })
  }
}

module.exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('CharacterValueFavorites')
  await knex.schema.dropTableIfExists('ValueComparisonFavorites')
}
