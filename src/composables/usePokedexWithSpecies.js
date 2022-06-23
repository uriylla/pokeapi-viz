import useResourceOnMounted from './useResourceOnMounted'
import { getUrl } from '../services/api'
import { ref, watch } from 'vue'

const usePokedexWithSpecies = pokedexId => {
  const species = ref(null)
  const loading = ref(true)

  const { resource } = useResourceOnMounted('pokedex', pokedexId)
  watch(resource, async () => {
    const pokedexEntries = resource.value.pokemon_entries
    Promise.all(
      pokedexEntries.map(async entry => {
        let speciesData
        let defaultVariety
        try {
          const response = await getUrl(entry.pokemon_species.url)
          speciesData = response.data
          const defaultVarietyUrl = speciesData.varieties.find(
            v => v.is_default
          ).pokemon.url
          const response2 = await getUrl(defaultVarietyUrl)
          defaultVariety = response2.data
        } catch (e) {
          console.log(e)
        }
        loading.value = false
        return {
          ...speciesData,
          defaultVariety,
          entry_number: entry.entry_number
        }
      })
    ).then(result => {
      species.value = result
    })
  })

  return { species, loading }
}

export default usePokedexWithSpecies
