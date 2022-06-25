
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function compute_rest_props(props, keys) {
        const rest = {};
        keys = new Set(keys);
        for (const k in props)
            if (!keys.has(k) && k[0] !== '$')
                rest[k] = props[k];
        return rest;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_svg_attributes(node, attributes) {
        for (const key in attributes) {
            attr(node, key, attributes[key]);
        }
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.47.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    // Idea and implementation from https://github.com/hperrin/svelte-material-ui/blob/273ded17c978ece3dd87f32a58dd9839e5c61325/components/forwardEvents.js

    // Export events for testing
    const nativeEvents = [
      'focus', 'blur',
      'fullscreenchange', 'fullscreenerror', 'scroll',
      'cut', 'copy', 'paste',
      'keydown', 'keypress', 'keyup',
      'auxclick', 'click', 'contextmenu', 'dblclick', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseover', 'mouseout', 'mouseup', 'pointerlockchange', 'pointerlockerror', 'select', 'wheel',
      'drag', 'dragend', 'dragenter', 'dragstart', 'dragleave', 'dragover', 'drop',
      'touchcancel', 'touchend', 'touchmove', 'touchstart',
      'pointerover', 'pointerenter', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerout', 'pointerleave', 'gotpointercapture', 'lostpointercapture'
    ];

    function forwardEventsBuilder(component, additionalEvents = []) {
      const events = [
        ...nativeEvents,
        ...additionalEvents
      ];

      function forward(e) {
        bubble(component, e);
      }

      return node => {
        const destructors = [];

        for (let i = 0; i < events.length; i++) {
          destructors.push(listen(node, events[i], forward));
        }

        return {
          destroy: () => {
            for (let i = 0; i < destructors.length; i++) {
              destructors[i]();
            }
          }
        }
      };
    }

    /* node_modules/.pnpm/svelte-inline-svg@1.1.3/node_modules/svelte-inline-svg/src/inline-svg.svelte generated by Svelte v3.47.0 */

    const { Error: Error_1, console: console_1$1 } = globals;
    const file$1 = "node_modules/.pnpm/svelte-inline-svg@1.1.3/node_modules/svelte-inline-svg/src/inline-svg.svelte";

    function create_fragment$1(ctx) {
    	let svg;
    	let mounted;
    	let dispose;

    	let svg_levels = [
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		/*svgAttrs*/ ctx[0],
    		/*$$restProps*/ ctx[3],
    		{ contenteditable: "true" }
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			set_svg_attributes(svg, svg_data);
    			if (/*svgContent*/ ctx[1] === void 0) add_render_callback(() => /*svg_input_handler*/ ctx[6].call(svg));
    			add_location(svg, file$1, 104, 0, 2694);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);

    			if (/*svgContent*/ ctx[1] !== void 0) {
    				svg.innerHTML = /*svgContent*/ ctx[1];
    			}

    			if (!mounted) {
    				dispose = [
    					action_destroyer(/*forwardEvents*/ ctx[2].call(null, svg)),
    					listen_dev(svg, "input", /*svg_input_handler*/ ctx[6])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				dirty & /*svgAttrs*/ 1 && /*svgAttrs*/ ctx[0],
    				dirty & /*$$restProps*/ 8 && /*$$restProps*/ ctx[3],
    				{ contenteditable: "true" }
    			]));

    			if (dirty & /*svgContent*/ 2 && /*svgContent*/ ctx[1] !== svg.innerHTML) {
    				svg.innerHTML = /*svgContent*/ ctx[1];
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function filterAttrs(attrs) {
    	return Object.keys(attrs).reduce(
    		(result, key) => {
    			if (attrs[key] !== false && attrs[key] !== null && attrs[key] !== undefined) {
    				result[key] = attrs[key];
    			}

    			return result;
    		},
    		{}
    	);
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const omit_props_names = ["src","transformSrc"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Inline_svg', slots, []);
    	const dispatch = createEventDispatcher();
    	const forwardEvents = forwardEventsBuilder(get_current_component());
    	let { src } = $$props;
    	let { transformSrc = svg => svg } = $$props;

    	onMount(() => {
    		inline(src);
    	});

    	let cache = {};
    	let isLoaded = false;
    	let svgAttrs = {};
    	let svgContent;

    	function download(url) {
    		return new Promise((resolve, reject) => {
    				const request = new XMLHttpRequest();
    				request.open('GET', url, true);

    				request.onload = () => {
    					if (request.status >= 200 && request.status < 400) {
    						try {
    							// Setup a parser to convert the response to text/xml in order for it to be manipulated and changed
    							const parser = new DOMParser();

    							const result = parser.parseFromString(request.responseText, 'text/xml');
    							let svgEl = result.querySelector('svg');

    							if (svgEl) {
    								// Apply transformation
    								svgEl = transformSrc(svgEl);

    								resolve(svgEl);
    							} else {
    								reject(new Error('Loaded file is not valid SVG"'));
    							}
    						} catch(error) {
    							reject(error);
    						}
    					} else {
    						reject(new Error('Error loading SVG'));
    					}
    				};

    				request.onerror = reject;
    				request.send();
    			});
    	}

    	function inline(src) {
    		// fill cache by src with promise
    		if (!cache[src]) {
    			// notify svg is unloaded
    			if (isLoaded) {
    				isLoaded = false;
    				dispatch('unloaded');
    			}

    			// download
    			cache[src] = download(src);
    		}

    		// inline svg when cached promise resolves
    		cache[src].then(async svg => {
    			// copy attrs
    			const attrs = svg.attributes;

    			for (let i = attrs.length - 1; i >= 0; i--) {
    				$$invalidate(0, svgAttrs[attrs[i].name] = attrs[i].value, svgAttrs);
    			}

    			// copy inner html
    			$$invalidate(1, svgContent = svg.innerHTML);

    			// render svg element
    			await tick();

    			isLoaded = true;
    			dispatch('loaded');
    		}).catch(error => {
    			// remove cached rejected promise so next image can try load again
    			delete cache[src];

    			console.error(error);
    		});
    	}

    	function svg_input_handler() {
    		svgContent = this.innerHTML;
    		$$invalidate(1, svgContent);
    	}

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(3, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ('src' in $$new_props) $$invalidate(4, src = $$new_props.src);
    		if ('transformSrc' in $$new_props) $$invalidate(5, transformSrc = $$new_props.transformSrc);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		createEventDispatcher,
    		tick,
    		get_current_component,
    		forwardEventsBuilder,
    		dispatch,
    		forwardEvents,
    		src,
    		transformSrc,
    		cache,
    		isLoaded,
    		svgAttrs,
    		svgContent,
    		filterAttrs,
    		download,
    		inline
    	});

    	$$self.$inject_state = $$new_props => {
    		if ('src' in $$props) $$invalidate(4, src = $$new_props.src);
    		if ('transformSrc' in $$props) $$invalidate(5, transformSrc = $$new_props.transformSrc);
    		if ('cache' in $$props) cache = $$new_props.cache;
    		if ('isLoaded' in $$props) isLoaded = $$new_props.isLoaded;
    		if ('svgAttrs' in $$props) $$invalidate(0, svgAttrs = $$new_props.svgAttrs);
    		if ('svgContent' in $$props) $$invalidate(1, svgContent = $$new_props.svgContent);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		svgAttrs,
    		svgContent,
    		forwardEvents,
    		$$restProps,
    		src,
    		transformSrc,
    		svg_input_handler
    	];
    }

    class Inline_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { src: 4, transformSrc: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Inline_svg",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*src*/ ctx[4] === undefined && !('src' in props)) {
    			console_1$1.warn("<Inline_svg> was created without expected prop 'src'");
    		}
    	}

    	get src() {
    		throw new Error_1("<Inline_svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set src(value) {
    		throw new Error_1("<Inline_svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get transformSrc() {
    		throw new Error_1("<Inline_svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set transformSrc(value) {
    		throw new Error_1("<Inline_svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.47.0 */

    const { console: console_1, window: window_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[26] = list[i];
    	child_ctx[27] = list;
    	child_ctx[28] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[29] = list[i];
    	child_ctx[31] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[32] = list[i];
    	child_ctx[34] = i;
    	return child_ctx;
    }

    // (121:5) {#each new Array(6) as yy,iy}
    function create_each_block_2(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[17](/*ix*/ ctx[31], /*iy*/ ctx[34], ...args);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "⬤";
    			attr_dev(div, "class", "grow flex f0 row-center-center p0-5 pointer");
    			toggle_class(div, "filled", /*x*/ ctx[0] == /*ix*/ ctx[31] && /*y*/ ctx[1] == /*iy*/ ctx[34]);
    			add_location(div, file, 121, 6, 1986);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*x, y*/ 3) {
    				toggle_class(div, "filled", /*x*/ ctx[0] == /*ix*/ ctx[31] && /*y*/ ctx[1] == /*iy*/ ctx[34]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(121:5) {#each new Array(6) as yy,iy}",
    		ctx
    	});

    	return block;
    }

    // (118:3) {#each new Array(3) as xx,ix}
    function create_each_block_1(ctx) {
    	let div;
    	let t;
    	let each_value_2 = new Array(6);
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			attr_dev(div, "class", "flex grow column-stretch-flex-start");
    			add_location(div, file, 118, 4, 1894);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*x, y, onClick*/ 2051) {
    				each_value_2 = new Array(6);
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(118:3) {#each new Array(3) as xx,ix}",
    		ctx
    	});

    	return block;
    }

    // (164:4) {#each [0,1,3,2] as idx, i}
    function create_each_block(ctx) {
    	let label;
    	let strong;
    	let t0_value = /*names*/ ctx[14][/*i*/ ctx[28]] + "";
    	let t0;
    	let t1;
    	let input;
    	let t2;
    	let span;
    	let t3;
    	let mounted;
    	let dispose;

    	function input_change_handler() {
    		/*input_change_handler*/ ctx[21].call(input, /*idx*/ ctx[26]);
    	}

    	const block = {
    		c: function create() {
    			label = element("label");
    			strong = element("strong");
    			t0 = text(t0_value);
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			span = element("span");
    			t3 = space();
    			attr_dev(strong, "class", "f0 mr1 w2em");
    			add_location(strong, file, 165, 6, 3013);
    			attr_dev(input, "type", "checkbox");
    			add_location(input, file, 166, 6, 3067);
    			add_location(span, file, 169, 6, 3143);
    			attr_dev(label, "class", "checkbox mb0-5 pointer");
    			add_location(label, file, 164, 5, 2968);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, strong);
    			append_dev(strong, t0);
    			append_dev(label, t1);
    			append_dev(label, input);
    			input.checked = /*corners*/ ctx[5][/*idx*/ ctx[26]];
    			append_dev(label, t2);
    			append_dev(label, span);
    			append_dev(label, t3);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", input_change_handler);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*corners*/ 32) {
    				input.checked = /*corners*/ ctx[5][/*idx*/ ctx[26]];
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(164:4) {#each [0,1,3,2] as idx, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let nav;
    	let button;
    	let t1;
    	let span0;
    	let t3;
    	let div0;
    	let t4;
    	let div6;
    	let div1;
    	let span1;
    	let t6;
    	let span2;
    	let t7;
    	let t8;
    	let input0;
    	let t9;
    	let div2;
    	let span3;
    	let t11;
    	let span4;
    	let t12;
    	let t13;
    	let input1;
    	let t14;
    	let div3;
    	let span5;
    	let t16;
    	let span6;
    	let t17;
    	let t18;
    	let input2;
    	let t19;
    	let div4;
    	let t20;
    	let div5;
    	let span7;
    	let t22;
    	let span8;
    	let t23;
    	let t24;
    	let input3;
    	let t25;
    	let a;
    	let span11;
    	let span10;
    	let span9;
    	let inlinesvg;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value_1 = new Array(3);
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = [0, 1, 3, 2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < 4; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	inlinesvg = new Inline_svg({
    			props: { src: "liberatedinterfaces.svg" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			nav = element("nav");
    			button = element("button");
    			button.textContent = "Reset";
    			t1 = space();
    			span0 = element("span");
    			span0.textContent = "Versions";
    			t3 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t4 = space();
    			div6 = element("div");
    			div1 = element("div");
    			span1 = element("span");
    			span1.textContent = "Padding";
    			t6 = space();
    			span2 = element("span");
    			t7 = text(/*padding*/ ctx[2]);
    			t8 = space();
    			input0 = element("input");
    			t9 = space();
    			div2 = element("div");
    			span3 = element("span");
    			span3.textContent = "Skew";
    			t11 = space();
    			span4 = element("span");
    			t12 = text(/*skew*/ ctx[3]);
    			t13 = space();
    			input1 = element("input");
    			t14 = space();
    			div3 = element("div");
    			span5 = element("span");
    			span5.textContent = "Rounded";
    			t16 = space();
    			span6 = element("span");
    			t17 = text(/*radius*/ ctx[4]);
    			t18 = space();
    			input2 = element("input");
    			t19 = space();
    			div4 = element("div");

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].c();
    			}

    			t20 = space();
    			div5 = element("div");
    			span7 = element("span");
    			span7.textContent = "Stroke";
    			t22 = space();
    			span8 = element("span");
    			t23 = text(/*stroke*/ ctx[6]);
    			t24 = space();
    			input3 = element("input");
    			t25 = space();
    			a = element("a");
    			span11 = element("span");
    			span10 = element("span");
    			span9 = element("span");
    			create_component(inlinesvg.$$.fragment);
    			attr_dev(button, "class", "m0-5 p1 uppercase f0 bold");
    			add_location(button, file, 110, 2, 1706);
    			attr_dev(span0, "class", "p0-5");
    			add_location(span0, file, 115, 2, 1796);
    			attr_dev(div0, "class", "flex p0-5");
    			add_location(div0, file, 116, 2, 1833);
    			add_location(span1, file, 133, 4, 2283);
    			add_location(span2, file, 134, 4, 2308);
    			attr_dev(div1, "class", "flex row-space-between-center");
    			add_location(div1, file, 132, 3, 2235);
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "class", "rounded radius1em");
    			attr_dev(input0, "min", "0");
    			attr_dev(input0, "max", "8");
    			add_location(input0, file, 136, 3, 2344);
    			add_location(span3, file, 143, 4, 2503);
    			add_location(span4, file, 144, 4, 2525);
    			attr_dev(div2, "class", "flex row-space-between-center");
    			add_location(div2, file, 142, 3, 2455);
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "class", "rounded radius1em");
    			attr_dev(input1, "min", "-45");
    			attr_dev(input1, "max", "45");
    			add_location(input1, file, 146, 3, 2558);
    			add_location(span5, file, 153, 4, 2717);
    			add_location(span6, file, 154, 4, 2742);
    			attr_dev(div3, "class", "flex row-space-between-center");
    			add_location(div3, file, 152, 3, 2669);
    			attr_dev(input2, "type", "range");
    			attr_dev(input2, "class", "rounded radius1em");
    			attr_dev(input2, "min", "4");
    			attr_dev(input2, "max", "16");
    			add_location(input2, file, 156, 3, 2777);
    			attr_dev(div4, "class", "flex");
    			set_style(div4, "flex-wrap", "wrap");
    			add_location(div4, file, 162, 3, 2888);
    			add_location(span7, file, 174, 4, 3239);
    			add_location(span8, file, 175, 4, 3263);
    			attr_dev(div5, "class", "flex row-space-between-center");
    			add_location(div5, file, 173, 3, 3191);
    			attr_dev(input3, "type", "range");
    			attr_dev(input3, "class", "rounded radius1em");
    			attr_dev(input3, "min", "20");
    			attr_dev(input3, "max", "60");
    			add_location(input3, file, 177, 3, 3298);
    			attr_dev(div6, "class", "cmtb0-5 cmlr0-5 flex column");
    			add_location(div6, file, 131, 2, 2190);
    			attr_dev(nav, "class", "flex column bg z-index99 rel w10em");
    			toggle_class(nav, "none", !/*showUI*/ ctx[7]);
    			add_location(nav, file, 107, 1, 1629);
    			attr_dev(span9, "class", "svg block");
    			set_style(span9, "transform", "translate(" + /*xpos*/ ctx[10] + "%, " + /*ypos*/ ctx[9] + "%)");
    			add_location(span9, file, 194, 4, 3739);
    			set_style(span10, "width", /*widths*/ ctx[12][/*x*/ ctx[0]] + "px");
    			set_style(span10, "height", /*heights*/ ctx[13][/*x*/ ctx[0]] + "px");
    			attr_dev(span10, "class", "container block");
    			add_location(span10, file, 191, 3, 3644);
    			set_style(span11, "padding", /*padding*/ ctx[2] + "px");
    			set_style(span11, "transform", "skew(" + -/*skew*/ ctx[3] + "deg,0deg) scale(2)");
    			set_style(span11, "border-radius", /*radiuses*/ ctx[8]);
    			attr_dev(span11, "class", "outline mb10 block");
    			add_location(span11, file, 188, 2, 3506);
    			attr_dev(a, "href", "mailto:g@sinnott.cc");
    			attr_dev(a, "class", "logo w100pc flex row-center-center");
    			add_location(a, file, 185, 1, 3425);
    			attr_dev(main, "class", "sassis fill overflow-auto flex bold uppercase");
    			set_style(main, "--svg-stroke", /*stroke*/ ctx[6] + "px");
    			add_location(main, file, 103, 0, 1530);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, nav);
    			append_dev(nav, button);
    			append_dev(nav, t1);
    			append_dev(nav, span0);
    			append_dev(nav, t3);
    			append_dev(nav, div0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div0, null);
    			}

    			append_dev(nav, t4);
    			append_dev(nav, div6);
    			append_dev(div6, div1);
    			append_dev(div1, span1);
    			append_dev(div1, t6);
    			append_dev(div1, span2);
    			append_dev(span2, t7);
    			append_dev(div6, t8);
    			append_dev(div6, input0);
    			set_input_value(input0, /*padding*/ ctx[2]);
    			append_dev(div6, t9);
    			append_dev(div6, div2);
    			append_dev(div2, span3);
    			append_dev(div2, t11);
    			append_dev(div2, span4);
    			append_dev(span4, t12);
    			append_dev(div6, t13);
    			append_dev(div6, input1);
    			set_input_value(input1, /*skew*/ ctx[3]);
    			append_dev(div6, t14);
    			append_dev(div6, div3);
    			append_dev(div3, span5);
    			append_dev(div3, t16);
    			append_dev(div3, span6);
    			append_dev(span6, t17);
    			append_dev(div6, t18);
    			append_dev(div6, input2);
    			set_input_value(input2, /*radius*/ ctx[4]);
    			append_dev(div6, t19);
    			append_dev(div6, div4);

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].m(div4, null);
    			}

    			append_dev(div6, t20);
    			append_dev(div6, div5);
    			append_dev(div5, span7);
    			append_dev(div5, t22);
    			append_dev(div5, span8);
    			append_dev(span8, t23);
    			append_dev(div6, t24);
    			append_dev(div6, input3);
    			set_input_value(input3, /*stroke*/ ctx[6]);
    			append_dev(main, t25);
    			append_dev(main, a);
    			append_dev(a, span11);
    			append_dev(span11, span10);
    			append_dev(span10, span9);
    			mount_component(inlinesvg, span9, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window_1, "keydown", /*onKeydown*/ ctx[15], false, false, false),
    					listen_dev(button, "click", reset, false, false, false),
    					listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[18]),
    					listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[18]),
    					listen_dev(input1, "change", /*input1_change_input_handler*/ ctx[19]),
    					listen_dev(input1, "input", /*input1_change_input_handler*/ ctx[19]),
    					listen_dev(input2, "change", /*input2_change_input_handler*/ ctx[20]),
    					listen_dev(input2, "input", /*input2_change_input_handler*/ ctx[20]),
    					listen_dev(input3, "change", /*input3_change_input_handler*/ ctx[22]),
    					listen_dev(input3, "input", /*input3_change_input_handler*/ ctx[22])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*x, y, onClick*/ 2051) {
    				each_value_1 = new Array(3);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (!current || dirty[0] & /*padding*/ 4) set_data_dev(t7, /*padding*/ ctx[2]);

    			if (dirty[0] & /*padding*/ 4) {
    				set_input_value(input0, /*padding*/ ctx[2]);
    			}

    			if (!current || dirty[0] & /*skew*/ 8) set_data_dev(t12, /*skew*/ ctx[3]);

    			if (dirty[0] & /*skew*/ 8) {
    				set_input_value(input1, /*skew*/ ctx[3]);
    			}

    			if (!current || dirty[0] & /*radius*/ 16) set_data_dev(t17, /*radius*/ ctx[4]);

    			if (dirty[0] & /*radius*/ 16) {
    				set_input_value(input2, /*radius*/ ctx[4]);
    			}

    			if (dirty[0] & /*corners, names*/ 16416) {
    				each_value = [0, 1, 3, 2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < 4; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div4, null);
    					}
    				}

    				for (; i < 4; i += 1) {
    					each_blocks[i].d(1);
    				}
    			}

    			if (!current || dirty[0] & /*stroke*/ 64) set_data_dev(t23, /*stroke*/ ctx[6]);

    			if (dirty[0] & /*stroke*/ 64) {
    				set_input_value(input3, /*stroke*/ ctx[6]);
    			}

    			if (dirty[0] & /*showUI*/ 128) {
    				toggle_class(nav, "none", !/*showUI*/ ctx[7]);
    			}

    			if (!current || dirty[0] & /*xpos, ypos*/ 1536) {
    				set_style(span9, "transform", "translate(" + /*xpos*/ ctx[10] + "%, " + /*ypos*/ ctx[9] + "%)");
    			}

    			if (!current || dirty[0] & /*x*/ 1) {
    				set_style(span10, "width", /*widths*/ ctx[12][/*x*/ ctx[0]] + "px");
    			}

    			if (!current || dirty[0] & /*x*/ 1) {
    				set_style(span10, "height", /*heights*/ ctx[13][/*x*/ ctx[0]] + "px");
    			}

    			if (!current || dirty[0] & /*padding*/ 4) {
    				set_style(span11, "padding", /*padding*/ ctx[2] + "px");
    			}

    			if (!current || dirty[0] & /*skew*/ 8) {
    				set_style(span11, "transform", "skew(" + -/*skew*/ ctx[3] + "deg,0deg) scale(2)");
    			}

    			if (!current || dirty[0] & /*radiuses*/ 256) {
    				set_style(span11, "border-radius", /*radiuses*/ ctx[8]);
    			}

    			if (!current || dirty[0] & /*stroke*/ 64) {
    				set_style(main, "--svg-stroke", /*stroke*/ ctx[6] + "px");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(inlinesvg.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(inlinesvg.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			destroy_component(inlinesvg);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function reset() {
    	window.location.hash = '';
    	window.location.reload();
    }

    function instance($$self, $$props, $$invalidate) {
    	let xpos;
    	let ypos;
    	let radiuses;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);

    	function onClick(xx, yy) {
    		$$invalidate(0, x = xx);
    		$$invalidate(1, y = yy);
    	}

    	let off = { 0: 0, 1: 30, 2: 50 };
    	let widths = { 0: 180, 1: 30, 2: 28 };
    	let heights = { 0: 52, 1: 30, 2: 28 };
    	let x = 0;
    	let y = 0;
    	let padding = 2;
    	let skew = 10;
    	let radius = 10;
    	let corners = [true, false, true, false];
    	let names = ['TL', 'TR', 'BL', 'BR'];
    	let stroke = 32;
    	let init = false;

    	onMount(e => {
    		load();
    		$$invalidate(16, init = true);
    	});

    	function load() {
    		try {
    			const hash = decodeURI(window.location.hash.substring(1));
    			console.log(hash);
    			const json = JSON.parse(hash);
    			$$invalidate(0, x = json.x);
    			$$invalidate(1, y = json.y);
    			$$invalidate(2, padding = json.padding);
    			$$invalidate(3, skew = json.skew);
    			$$invalidate(4, radius = json.radius);
    			$$invalidate(5, corners = json.corners);
    			$$invalidate(6, stroke = json.stroke);
    		} catch(err) {
    			
    		}
    	}

    	function save() {
    	}

    	let showUI = false;

    	function onKeydown(e) {
    		if (e.key == 'Tab') $$invalidate(7, showUI = !showUI);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = (ix, iy, e) => onClick(ix, iy);

    	function input0_change_input_handler() {
    		padding = to_number(this.value);
    		$$invalidate(2, padding);
    	}

    	function input1_change_input_handler() {
    		skew = to_number(this.value);
    		$$invalidate(3, skew);
    	}

    	function input2_change_input_handler() {
    		radius = to_number(this.value);
    		$$invalidate(4, radius);
    	}

    	function input_change_handler(idx) {
    		corners[idx] = this.checked;
    		$$invalidate(5, corners);
    	}

    	function input3_change_input_handler() {
    		stroke = to_number(this.value);
    		$$invalidate(6, stroke);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		InlineSVG: Inline_svg,
    		onClick,
    		off,
    		widths,
    		heights,
    		x,
    		y,
    		padding,
    		skew,
    		radius,
    		corners,
    		names,
    		stroke,
    		init,
    		load,
    		save,
    		reset,
    		showUI,
    		onKeydown,
    		radiuses,
    		ypos,
    		xpos
    	});

    	$$self.$inject_state = $$props => {
    		if ('off' in $$props) $$invalidate(23, off = $$props.off);
    		if ('widths' in $$props) $$invalidate(12, widths = $$props.widths);
    		if ('heights' in $$props) $$invalidate(13, heights = $$props.heights);
    		if ('x' in $$props) $$invalidate(0, x = $$props.x);
    		if ('y' in $$props) $$invalidate(1, y = $$props.y);
    		if ('padding' in $$props) $$invalidate(2, padding = $$props.padding);
    		if ('skew' in $$props) $$invalidate(3, skew = $$props.skew);
    		if ('radius' in $$props) $$invalidate(4, radius = $$props.radius);
    		if ('corners' in $$props) $$invalidate(5, corners = $$props.corners);
    		if ('names' in $$props) $$invalidate(14, names = $$props.names);
    		if ('stroke' in $$props) $$invalidate(6, stroke = $$props.stroke);
    		if ('init' in $$props) $$invalidate(16, init = $$props.init);
    		if ('showUI' in $$props) $$invalidate(7, showUI = $$props.showUI);
    		if ('radiuses' in $$props) $$invalidate(8, radiuses = $$props.radiuses);
    		if ('ypos' in $$props) $$invalidate(9, ypos = $$props.ypos);
    		if ('xpos' in $$props) $$invalidate(10, xpos = $$props.xpos);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*x*/ 1) {
    			$$invalidate(10, xpos = -off[x]);
    		}

    		if ($$self.$$.dirty[0] & /*y*/ 2) {
    			$$invalidate(9, ypos = (y + 1) * -10);
    		}

    		if ($$self.$$.dirty[0] & /*corners, radius*/ 48) {
    			$$invalidate(8, radiuses = ((_corners, _radius) => {
    				let str = '';
    				for (const b of corners) str += b ? radius + 'px ' : '0px ';
    				return str;
    			})());
    		}

    		if ($$self.$$.dirty[0] & /*init, padding, skew, radius, corners, stroke, x, y*/ 65663) ;
    	};

    	return [
    		x,
    		y,
    		padding,
    		skew,
    		radius,
    		corners,
    		stroke,
    		showUI,
    		radiuses,
    		ypos,
    		xpos,
    		onClick,
    		widths,
    		heights,
    		names,
    		onKeydown,
    		init,
    		click_handler,
    		input0_change_input_handler,
    		input1_change_input_handler,
    		input2_change_input_handler,
    		input_change_handler,
    		input3_change_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
