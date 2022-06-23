import axios from 'axios'

export function getResource(resource, i) {
  return axios.get(`https://pokeapi.co/api/v2/${resource}/${i}`)
}

export function getUrl (url) {
  return axios.get(url)
}
