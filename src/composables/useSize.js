import { ref, onMounted } from 'vue'

export default function useResourceOnMounted (element) {
  const size = ref({ width: 0, height: 0 })

  onMounted(() => {
    const resizeObserver = new ResizeObserver(entries => {
      entries.forEach(entry => {
        size.value = {
          width: entry.contentRect.width,
          height: entry.contentRect.height
        }
      })
    })
    resizeObserver.observe(element.value)
  })

  return size
}
