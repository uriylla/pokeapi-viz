import { ref, onMounted } from 'vue'
import { getUrl } from '../services/api'

export default function useResourceOnMounted (resources) {
  const data = ref(null)
  const loading = ref(true)
  const error = ref(null)

  Promise.all(resources.map(resource => {
    return getUrl(resource.url).then(resourceData => {
      return resourceData.data
    })
  })).then(data => {
    data.value = data
  }).catch(e => {
    error.val = e
  }).finally(() => {
    loading.value = false
  })

  return { resources: data, loading, error }
}
