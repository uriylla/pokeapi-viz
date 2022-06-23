import { quadtree as d3_quadtree } from 'd3-quadtree'
function x(d) {
  return d.x + d.vx
}

function y(d) {
  return d.y + d.vy
}
function jiggle(random) {
  return (random() - 0.5) * 1e-6
}
function constant(x) {
  return function() {
    return x
  }
}
export function forceCollideOptional(radius) {
  var nodes,
    radii,
    random,
    strength = 1,
    iterations = 1

  if (typeof radius !== 'function') radius = constant(radius == null ? 1 : +radius)

  function force() {
    var i,
      n = nodes.length,
      tree,
      node,
      xi,
      yi,
      ri,
      ri2

    for (var k = 0; k < iterations; ++k) {
      tree = d3_quadtree(nodes, x, y).visitAfter(prepare)
      for (i = 0; i < n; ++i) {
        node = nodes[i]
        ;(ri = radii[node.index]), (ri2 = ri * ri)
        xi = node.x + node.vx
        yi = node.y + node.vy
        tree.visit(apply)
      }
    }

    function apply(quad, x0, y0, x1, y1) {
      var data = quad.data,
        rj = quad.r,
        r = ri + rj
      // r = r * (2 - alpha)
      if (data) {
        if (data.index > node.index) {
          var x = xi - data.x - data.vx,
            y = yi - data.y - data.vy,
            l = x * x + y * y
          if (l < r * r) {
            if (x === 0) (x = jiggle(random)), (l += x * x)
            if (y === 0) (y = jiggle(random)), (l += y * y)
            l = ((r - (l = Math.sqrt(l))) / l) * strength(data, node)
            node.vx += (x *= l) * (r = (rj *= rj) / (ri2 + rj))
            node.vy += (y *= l) * r
            data.vx -= x * (r = 1 - r)
            data.vy -= y * r
          }
        }
        return
      }
      return x0 > xi + r || x1 < xi - r || y0 > yi + r || y1 < yi - r
    }
  }

  function prepare(quad) {
    if (quad.data) return (quad.r = radii[quad.data.index])
    for (var i = (quad.r = 0); i < 4; ++i) {
      if (quad[i] && quad[i].r > quad.r) {
        quad.r = quad[i].r
      }
    }
  }

  function initialize() {
    if (!nodes) return
    var i,
      n = nodes.length,
      node
    radii = new Array(n)
    for (i = 0; i < n; ++i) (node = nodes[i]), (radii[node.index] = +radius(node, i, nodes))
  }

  force.initialize = function(_nodes, _random) {
    nodes = _nodes
    random = _random
    initialize()
  }

  force.iterations = function(_) {
    return arguments.length ? ((iterations = +_), force) : iterations
  }

  force.strength = function(_) {
    return arguments.length
      ? ((strength = typeof _ === 'function' ? _ : constant(+_)), force)
      : strength
  }

  force.radius = function(_) {
    return arguments.length
      ? ((radius = typeof _ === 'function' ? _ : constant(+_)), initialize(), force)
      : radius
  }

  return force
}

/**
 * Pulls nodes toward a set of cluster center nodes / points.
 * Adapted from Mike Bostock's Clustered Force Layout III:
 * https://bl.ocks.org/mbostock/7881887
 */
export function forceCluster(centers) {
  let nodes,
    centerpoints = [],
    strength = 0.1,
    centerInertia = 0.0

  // coerce centers accessor into a function
  if (typeof centers !== 'function') centers = () => centers

  function force(alpha) {
    // scale + curve alpha value
    // alpha *= strength * alpha

    let c, x, y, l, r
    nodes.forEach((d, i) => {
      c = centerpoints[i]
      if (!c || c === d) return
      ;(x = d.x - c.x), (y = d.y - c.y), (l = Math.sqrt(x * x + y * y)), (r = d.r + (c.radius || 0))

      if (l && l != r) {
        l = ((l - r) / l) * alpha * alpha * strength(d)
        d.x -= x *= l
        d.y -= y *= l
        c.x += (1 - centerInertia) * x
        c.y += (1 - centerInertia) * y
      }
    })
  }

  function initialize() {
    if (!nodes) return

    // populate local `centerpoints` using `centers` accessor
    let i,
      n = nodes.length
    centerpoints = new Array(n)
    for (i = 0; i < n; i++) centerpoints[i] = centers(nodes[i], i, nodes)
  }

  /**
   * Reinitialize the force with the specified nodes.
   */
  force.initialize = _ => {
    nodes = _
    initialize()
  }

  /**
   * An array of objects representing the centerpoint of each cluster,
   * or a function that returns such an array.
   * Each object must have `x` and `y` values, and optionally `radius`.
   */
  force.centers = _ => {
    // return existing value if no value passed
    if (_ == null) return centers

    // coerce centers accessor into a function
    centers = typeof _ === 'function' ? _ : (n, i) => _[i]

    // reinitialize
    initialize()

    // allow chaining
    return force
  }

  /**
   * Strength of attraction to the cluster center node/position.
   */
  force.strength = _ => {
    return _ == null ? strength : ((strength = _), force)
  }

  /**
   * Inertia of cluster center nodes/positions.
   * Higher values mean the cluster center moves less;
   * lower values mean the cluster center is more easily
   * pulled around by other nodes in the cluster.
   * Typical values range from 0.0 (cluster centers move as much as all other nodes)
   * to 1.0 (cluster centers are not moved at all by the clustering force).
   */
  force.centerInertia = _ => {
    return _ == null ? centerInertia : ((centerInertia = +_), force)
  }

  return force
}

export function distance(a, b) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
}
