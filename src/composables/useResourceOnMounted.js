import { ref, onMounted } from 'vue'
import { getResource } from '../services/api'

export default function useResourceOnMounted (resourcePath, id) {
  const data = ref(null)
  const loading = ref(true)
  const error = ref(null)

  onMounted(() => {
    getResource(resourcePath, id).then(resourceData => {
      loading.value = false
      data.value = resourceData.data
      console.log(`${resource}/${i} fetched`, data.value)
    }).catch(e => {
      error.value = e
    }).finally(() => {
      loading.value = false
    })
  })

  return { resource: data, loading, error }
}
