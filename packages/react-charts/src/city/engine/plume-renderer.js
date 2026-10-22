import * as THREE from 'three'
import { makeParticles, samplePlume } from './plumes.js'

const vertexShader = `
attribute float aAlpha;attribute float aHeat;attribute float aSeed;
varying float vAlpha;varying float vHeat;varying float vSeed;
varying vec3 vNormal;varying vec3 vView;varying vec3 vLocal;
void main(){
  vAlpha=aAlpha;vHeat=aHeat;vSeed=aSeed;vLocal=position;
  vec4 mv=modelViewMatrix*instanceMatrix*vec4(position,1.);
  vec3 s=vec3(dot(instanceMatrix[0].xyz,instanceMatrix[0].xyz),dot(instanceMatrix[1].xyz,instanceMatrix[1].xyz),dot(instanceMatrix[2].xyz,instanceMatrix[2].xyz));
  vNormal=normalMatrix*mat3(instanceMatrix)*(normal/max(s,vec3(.000001)));vView=-mv.xyz;
  gl_Position=projectionMatrix*mv;
}`
const fragmentShader = `
uniform float uTime;uniform bool uSmoke;
varying float vAlpha;varying float vHeat;varying float vSeed;
varying vec3 vNormal;varying vec3 vView;varying vec3 vLocal;
void main(){
  float facing=pow(max(0.,dot(normalize(vNormal),normalize(vView))),.65);
  float billow=.73+.27*sin(vLocal.x*8.+vSeed+uTime*.7)*sin(vLocal.z*7.-vLocal.y*5.+vSeed);
  float alpha=vAlpha*facing*billow;
  if(alpha<.005)discard;
  vec3 color;
  if(uSmoke){float shade=mix(.035,.55,vHeat);color=vec3(shade*.97,shade,shade*.98)*(1.-.13*vLocal.y);}
  else{float core=clamp(vHeat*.78+facing*.32,0.,1.);color=mix(vec3(.98,.10,.006),vec3(1.,.93,.53),core*core);}
  gl_FragColor=vec4(color,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export class WindowPlumes {
  constructor(emitters, parent) {
    this.parent = parent
    this.layers = []
    this.dummy = new THREE.Object3D()
    this.velocity = new THREE.Vector3()
    this.up = new THREE.Vector3(0, 1, 0)
    for (const kind of ['flame', 'smoke']) {
      const particles = makeParticles(emitters, kind),
        geometry = new THREE.OctahedronGeometry(1, 0)
      const n = Math.max(1, particles.length)
      geometry.setAttribute(
        'aAlpha',
        new THREE.InstancedBufferAttribute(new Float32Array(n), 1).setUsage(
          THREE.DynamicDrawUsage,
        ),
      )
      geometry.setAttribute(
        'aHeat',
        new THREE.InstancedBufferAttribute(new Float32Array(n), 1).setUsage(
          THREE.DynamicDrawUsage,
        ),
      )
      geometry.setAttribute(
        'aSeed',
        new THREE.InstancedBufferAttribute(new Float32Array(n), 1),
      )
      particles.forEach((p, i) => (geometry.attributes.aSeed.array[i] = p.seed))
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        toneMapped: false,
        uniforms: { uTime: { value: 0 }, uSmoke: { value: kind === 'smoke' } },
      })
      const mesh = new THREE.InstancedMesh(geometry, material, n)
      mesh.count = particles.length
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      mesh.frustumCulled = false
      mesh.renderOrder = kind === 'smoke' ? 4 : 3
      parent.add(mesh)
      this.layers.push({ kind, particles, mesh })
    }
  }
  update(time, visible, active) {
    for (const layer of this.layers) {
      const { mesh, particles, kind } = layer
      mesh.visible = visible
      if (!visible) continue
      mesh.material.uniforms.uTime.value = time
      const alpha = mesh.geometry.attributes.aAlpha,
        heat = mesh.geometry.attributes.aHeat
      particles.forEach((particle, i) => {
        const age =
          (time + particle.phase + particle.source.seed) % particle.life
        const state = samplePlume(particle.source, age, particle.seed, kind)
        this.dummy.position.set(state.x, state.y, state.z)
        if (kind === 'flame') {
          this.velocity.set(state.vx, state.vy, state.vz).normalize()
          this.dummy.quaternion.setFromUnitVectors(this.up, this.velocity)
        } else
          this.dummy.rotation.set(
            particle.seed + time * 0.06,
            particle.seed * 0.7,
            particle.seed * 0.3,
          )
        this.dummy.scale.set(state.radius, state.length, state.radius)
        this.dummy.updateMatrix()
        mesh.setMatrixAt(i, this.dummy.matrix)
        alpha.array[i] = active.has(particle.source.company) ? state.alpha : 0
        heat.array[i] =
          kind === 'smoke'
            ? particle.source.critical
              ? 0.12 + (age / particle.life) * 0.36
              : 0.82
            : state.heat
      })
      mesh.instanceMatrix.needsUpdate = true
      alpha.needsUpdate = true
      heat.needsUpdate = true
    }
  }
}
