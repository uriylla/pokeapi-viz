<script setup>
import { ref, watch } from 'vue';
import usePokedexWithSpecies from '../composables/usePokedexWithSpecies'
import useSize from '../composables/useSize'
import { forceSimulation as d3_forceSimulation } from 'd3-force'
import {
  // forceManyBody as d3_forceManyBody,
  // forceCollide as d3_forceCollide,
  // forceLink as d3_forceLink,
  // forceCenter as d3_forceCenter,
  // forceRadial as d3_forceRadial,
  forceX as d3_forceX,
  forceY as d3_forceY,
} from 'd3-force'
import { select as d3_select } from 'd3-selection'
import { zoom as d3_zoom, zoomIdentity as d3_zoomIdentity } from 'd3-zoom'
import { group as d3_group } from 'd3-array'
import { pointer as d3_pointer } from 'd3-selection'
import { quadtree as d3_quadtree } from 'd3-quadtree'
import { extent as d3_extent } from 'd3-array'
import { forceCollideOptional, forceCluster, distance } from '../utils/simulationUtils'
import { schemeCategory10 as d3_schemeCategory10 } from 'd3-scale-chromatic'
// eslint-disable-next-line
import { computed } from '@vue/reactivity';

const COLORS = d3_schemeCategory10

const canvasRef = ref(null)
const imagesRef = ref(null)
const root = ref(null)
const zoomTransform = ref(d3_zoomIdentity)
const size = useSize(root)
const selectedPokemon = ref(null)

const typeColors = {
  normal: 'A8A77A',
  fire: 'EE8130',
  water: '6390F0',
  electric: 'F7D02C',
  grass: '7AC74C',
  ice: '96D9D6',
  fighting: 'C22E28',
  poison: 'A33EA1',
  ground: 'E2BF65',
  flying: 'A98FF3',
  psychic: 'F95587',
  bug: 'A6B91A',
  rock: 'B6A136',
  ghost: '735797',
  dragon: '6F35FC',
  dark: '705746',
  steel: 'B7B7CE',
  fairy: 'D685AD'
}

const typesToString = (types) => {
  return types.map(type => type.type.name).join('-')
}

const { species, loading } = usePokedexWithSpecies(2)

const clusters = computed(() => {
  let clusters = []
  d3_group(species.value, d => typesToString(d.defaultVariety.types)).forEach((value, key) => {
    value.sort((a, b) => b.weight - a.weight)
    clusters.push({
      id: key,
      types: typesToString(value[0].defaultVariety.types),
      pokemons: value,
    })
  })

  let total = species.value.length

  clusters.forEach((g, i) => {
    g.arcSize = (Math.PI * 2 * g.pokemons.length) / total
    g.startAngle = clusters[i - 1] ? clusters[i - 1].endAngle : Math.PI
    g.endAngle = g.startAngle + g.arcSize
    g.midAngle = g.startAngle + g.arcSize / 2
  })
  return clusters
})

const pokemons = computed(() => {
  if (!species.value) return []
  let extent = d3_extent(species.value, d => d.defaultVariety.weight)
  return (species.value || []).sort((a, b) => a.id - b.id).map(d => {
    const unitWeight = d.defaultVariety.weight / extent[1]
    let r = 15 + 45 * unitWeight
    let cluster = clusters.value.find(c => c.types === typesToString(d.defaultVariety.types))
    return {
      data: d,

      clusterId: cluster.id,
      types: cluster.types,
      r: r,
      unitWeight,
      id: d.id,
    }
  })
})

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const context = canvas.getContext('2d')

  const simulation =
    canvas.simulation ||
    d3_forceSimulation()
      .velocityDecay(0.5)
      .alphaDecay(0.005)
  canvas.simulation = simulation
  pokemons.value.forEach(d => {
    d.forcedX = null
    d.forcedY = null
    if (!d.x || !d.y) {
      let g = clusters.value.find(c => c.id === d.clusterId)
      let midAngle = g.startAngle + g.arcSize / 2
      d.x = Math.sin(midAngle) * (50 + (1 - d.unitWeight) * 200) + size.value.width / 2
      d.y = Math.cos(midAngle) * (50 + (1 - d.unitWeight) * 200) + size.value.height / 2
    }
  })
  simulation.nodes(pokemons.value)
  simulation
    .force(
      'collide',
      forceCollideOptional()
        .radius(d => {
          return d.r + 10
        })
        .strength(() => {
          return 0.8
        })
    )
    .force(
      'forceX',
      d3_forceX()
        .x(d => d.forcedX || size.value.width / 2)
        .strength(d => (d.forcedX !== null ? 0.7 : 0))
    )
    .force(
      'forceY',
      d3_forceY()
        .y(d => d.forcedY || size.value.height / 2)
        .strength(d => (d.forcedY !== null ? 0.7 : 0))
    )
    .force(
      'cluster',
      forceCluster()
        .centers(function(d) {
          let g = clusters.value.find(c => c.id === d.clusterId)
          return {
            x:
              Math.sin(g.midAngle) * (50 + (1 - d.unitWeight) * size.value.width * 0.2) +
              size.value.width / 2,
            y:
              Math.cos(g.midAngle) * (50 + (1 - d.unitWeight) * size.value.height * 0.2) +
              size.value.height / 2,
          }
        })
        .strength(d => (d.forcedX !== null ? 0 : 2))
        .centerInertia(1)
    )
  let renderPokemons = () => {
    simulation.nodes().forEach(node => {
      context.globalAlpha = 1
      let paddedR = node.r
      const types = node.types.split('-')
      types.forEach((type, i) => {
        const archSize = (2 * Math.PI)/types.length
        context.beginPath()
        context.moveTo(node.x + paddedR, node.y)
        context.arc(node.x, node.y, paddedR, i*archSize, (i+1)*archSize )
        context.strokeStyle = `#${typeColors[type]}`
        context.lineWidth = 5
        context.stroke()
      })
      context.fillStyle = (selectedPokemon.value && selectedPokemon.value.id === node.id) ? "lightblue" : "#ffffff";
      context.beginPath();
      context.arc(node.x, node.y, paddedR, 0, 2 * Math.PI);
      context.fill();
      paddedR = node.r - 5
      let image = imagesRef && imagesRef.value.find(el => +el.id === +node.id)
      if (image) {
        context.save()
        context.beginPath()
        context.moveTo(node.x + paddedR, node.y)
        context.arc(node.x, node.y, paddedR, 0, 2 * Math.PI)
        context.clip()
        context.drawImage(image, node.x - paddedR, node.y - paddedR, paddedR * 2, paddedR * 2)
        context.restore()
      }
    })
  }
  let render = function() {
    context.save()
    context.clearRect(0, 0, context.canvas.width, context.canvas.height)
    context.translate(zoomTransform.value.x, zoomTransform.value.y)
    context.scale(zoomTransform.value.k, zoomTransform.value.k)
    renderPokemons()
    context.restore()
  }

  d3_select(context.canvas).call(d3_zoom()
    .scaleExtent([1 / 2, 8])
    .on("zoom", ({transform}) => zoomed(transform)));

  const zoomed = (transform) => {
    zoomTransform.value = transform
    render()
  }
  simulation.on('tick', render)
  simulation.alpha(0.2).restart()


  let qt = d3_quadtree()
    .extent([
      [0, 0],
      [size.value.width, size.value.height],
    ])
    .x(d => d.x)
    .y(d => d.y)

  canvasRef.value.onclick = (e) => {
    qt.addAll(pokemons.value)
    let coords = d3_pointer(e)
    const invertedCoords = zoomTransform.value.invert(coords)
    let node = qt.find(invertedCoords[0], invertedCoords[1])
    if (node && distance(node, { x: invertedCoords[0], y: invertedCoords[1] }) > node.r) node = null
    if (node && node !== selectedPokemon.value) {
      selectedPokemon.value = node
    } else {
      selectedPokemon.value = null
    }
  }
}

watch(pokemons, () => !loading.value && draw())
watch(size, () => !loading.value && draw())
watch(loading, () => !loading.value && draw())

</script>

<template>
  <div class="root" ref="root">
    <canvas ref="canvasRef" :width="size.width" :height="size.height" />
    <div v-if="!loading" class="images" style="display: none">
      <img
        v-for="i in species"
        :id="i.id"
        ref="imagesRef"
        :key="i.id"
        :src="i.defaultVariety.sprites.front_default"
      >
    </div>
  </div>
</template>

<style scoped>
.root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-wrap: wrap;
}
</style>
