<script>
	import { onMount } from 'svelte'
	import InlineSVG from 'svelte-inline-svg'

	function onClick(xx,yy) {
		x = xx
		y = yy
	}

	let off = {
		0: 0,
		1: 30,
		2: 50
	}
	let widths = {
		0: 180,
		1: 30,
		2: 28
	}

	let heights = {
		0: 52,
		1: 30,
		2: 28
	}


	$: xpos = -off[x]
	$: ypos = ((y+1) * -10)

	let x = 0
	let y = 1
	let padding = 0
	let skew = 0
	let radius = 4
	let corners = [false,false,false,false]
	let names = ['TL','TR','BL','BR']
	let stroke = 40

	$: radiuses = ( (_corners,_radius) => {
		let str = ''
		for(const b of corners) str += b ? radius + 'px ' : '0px '
		console.log(str)
		return str

	})(corners,radius)

	let init = false
	onMount( e => {
		load()
		init = true
	})

	$: ( all => {
		if (!init) return
		save()
	})({padding,skew,radius,corners,stroke,x,y})

	function load() {
		try {
			const hash = decodeURI(window.location.hash.substring(1))
			console.log(hash)
			const json = JSON.parse( hash )
			x = json.x
			y = json.y
			padding = json.padding
			skew = json.skew
			radius = json.radius
			corners = json.corners
			stroke = json.stroke
		} catch(err) {}
	}

	function save() {
		const all = {
			padding,
			skew,
			radius,
			corners,
			stroke,
			x,
			y
		}
		try {
			window.location.hash = JSON.stringify(all)
		} catch(err) { 
			console.error(err)
		}
	}

	function reset() {
		window.location.hash = ''
		window.location.reload()
	}

</script>

<main 
	class="sassis fill overflow-auto flex bold uppercase"
	style="--svg-stroke: {stroke}px">

	<nav class="flex column bg z-index99 rel w10em">
		<button 
			on:click={reset}
			class="m0-5 p1 uppercase f0 bold">
			Reset
		</button>
		<span class="p0-5">Versions</span>
		<div class="flex p0-5">
			{#each new Array(3) as xx,ix}
				<div class="flex grow column-stretch-flex-start">

					{#each new Array(6) as yy,iy}
						<div
							on:click={e=>onClick(ix,iy)}
							class:filled={x==ix&&y==iy}
							class="grow flex f0 row-center-center p0-5 pointer">
							⬤
						</div>
					{/each}
				</div>
			{/each}
		</div>
		<div class="cmtb0-5 cmlr0-5 flex column">
			<div class="flex row-space-between-center">
				<span>Padding</span>
				<span>{padding}</span>
			</div>
			<input 
				type="range" 
				class="rounded radius1em"
				min="0"
				max="8"
				bind:value={padding} />
			<div class="flex row-space-between-center">
				<span>Skew</span>
				<span>{skew}</span>
			</div>
			<input 
				type="range" 
				class="rounded radius1em"
				min="-45"
				max="45"
				bind:value={skew} />
			<div class="flex row-space-between-center">
				<span>Rounded</span>
				<span>{radius}</span>
			</div>
			<input 
				type="range" 
				class="rounded radius1em"
				min="4"
				max="16"
				bind:value={radius} />
			<div class="flex" style="flex-wrap: wrap">
				{#each [0,1,3,2] as idx, i}
					<label class="checkbox mb0-5 pointer">
						<strong class="f0 mr1 w2em">{names[i]}</strong>
						<input 
							type="checkbox" 
							bind:checked={corners[idx]} />
						<span />
					</label>
				{/each}
			</div>
			<div class="flex row-space-between-center">
				<span>Stroke</span>
				<span>{stroke}</span>
			</div>
			<input 
				type="range" 
				class="rounded radius1em"
				min="20"
				max="60"
				bind:value={stroke} />
		</div>
	</nav>
	<div class="logo w100pc flex row-center-center">
		<div 
			style="padding:{padding}px;transform:skew({-skew}deg,0deg);border-radius:{radiuses}"
			class="outline">
			<div 
				style="width:{widths[x]}px;height:{heights[x]}px;"
				class="container">
				<div 
					class="svg"
					style="transform: translate({xpos}%, {ypos}%)"
					>
					<InlineSVG src="liberatedinterfaces.svg" />
				</div>
			</div>
		</div>
	</div>
</main>
