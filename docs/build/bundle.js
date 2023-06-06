
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
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
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
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
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
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
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
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

    /* src/App.svelte generated by Svelte v3.47.0 */

    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let div1;
    	let header;
    	let div0;
    	let h1;
    	let span0;
    	let t1;
    	let img;
    	let img_src_value;
    	let t2;
    	let article;
    	let p0;
    	let span1;
    	let t4;
    	let a0;
    	let t6;
    	let t7;
    	let h20;
    	let t9;
    	let ul;
    	let li0;
    	let t10;
    	let a1;
    	let t12;
    	let li1;
    	let t13;
    	let a2;
    	let t15;
    	let h21;
    	let t17;
    	let p1;
    	let t18;
    	let a3;
    	let t20;
    	let t21;
    	let form;
    	let input0;
    	let t22;
    	let input1;
    	let t23;
    	let label;
    	let a4;
    	let t25;
    	let input2;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div1 = element("div");
    			header = element("header");
    			div0 = element("div");
    			h1 = element("h1");
    			span0 = element("span");
    			span0.textContent = "Liberated Interfaces, Gilbert Sinnott, Autr";
    			t1 = space();
    			img = element("img");
    			t2 = space();
    			article = element("article");
    			p0 = element("p");
    			span1 = element("span");
    			span1.textContent = "L";
    			t4 = text("iberated Interfaces is a human-computer agency for the experimental research & development of mixed hardware & software tools by artist & designer ");
    			a0 = element("a");
    			a0.textContent = "Autr";
    			t6 = text(".");
    			t7 = space();
    			h20 = element("h2");
    			h20.textContent = "News";
    			t9 = space();
    			ul = element("ul");
    			li0 = element("li");
    			t10 = text("❂ \n\t\t\t\t\t");
    			a1 = element("a");
    			a1.textContent = "Video Feedback Still Life at re:publica 2023";
    			t12 = space();
    			li1 = element("li");
    			t13 = text("❂ \n\t\t\t\t\t");
    			a2 = element("a");
    			a2.textContent = "StarIOT, Better Factory KTE 2023";
    			t15 = space();
    			h21 = element("h2");
    			h21.textContent = "Contact";
    			t17 = space();
    			p1 = element("p");
    			t18 = text("Follow us on ");
    			a3 = element("a");
    			a3.textContent = "Instagram";
    			t20 = text(" or join our mailing list to learn more about current & future projects:");
    			t21 = space();
    			form = element("form");
    			input0 = element("input");
    			t22 = space();
    			input1 = element("input");
    			t23 = space();
    			label = element("label");
    			a4 = element("a");
    			a4.textContent = "subscribe";
    			t25 = space();
    			input2 = element("input");
    			attr_dev(span0, "class", "abs invisible");
    			add_location(span0, file, 14, 5, 209);
    			set_style(img, "filter", "invert()");
    			attr_dev(img, "class", "libinter w100pc");
    			if (!src_url_equal(img.src, img_src_value = "/liberatedinterfaces.png")) attr_dev(img, "src", img_src_value);
    			add_location(img, file, 15, 5, 293);
    			add_location(h1, file, 13, 4, 199);
    			add_location(div0, file, 12, 3, 189);
    			attr_dev(header, "class", "cmb2");
    			add_location(header, file, 11, 2, 164);
    			set_style(span1, "font-size", "2em");
    			set_style(span1, "line-height", "0.5em");
    			set_style(span1, "margin-right", "0.03em");
    			add_location(span1, file, 26, 4, 474);
    			attr_dev(a0, "href", "https://autr.tv");
    			add_location(a0, file, 26, 225, 695);
    			add_location(p0, file, 25, 3, 466);
    			add_location(h20, file, 31, 3, 745);
    			attr_dev(a1, "href", "https://re-publica.com/de/session/video-feedback-still-life");
    			add_location(a1, file, 35, 5, 804);
    			add_location(li0, file, 34, 4, 787);
    			attr_dev(a2, "href", "https://betterfactory.eu/better-factory-partners-and-mentors-visit-the-new-round-of-kte-teams-across-europe/");
    			add_location(a2, file, 40, 5, 967);
    			add_location(li1, file, 39, 4, 950);
    			attr_dev(ul, "class", "cmb0-5");
    			add_location(ul, file, 33, 3, 763);
    			add_location(h21, file, 46, 3, 1159);
    			attr_dev(a3, "href", "https://instagram.com/liberatedinterfaces");
    			add_location(a3, file, 48, 19, 1196);
    			add_location(p1, file, 48, 3, 1180);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Email address");
    			attr_dev(input0, "class", "minw10em mr0-5");
    			attr_dev(input0, "name", "email");
    			attr_dev(input0, "id", "tlemail");
    			add_location(input0, file, 58, 5, 1664);
    			attr_dev(input1, "type", "hidden");
    			input1.value = "1";
    			attr_dev(input1, "name", "embed");
    			add_location(input1, file, 64, 5, 1801);
    			add_location(a4, file, 66, 6, 1927);
    			attr_dev(input2, "class", "fill invisible pointer");
    			attr_dev(input2, "type", "submit");
    			input2.value = "Subscribe";
    			add_location(input2, file, 67, 6, 1950);
    			attr_dev(label, "class", "hyperlink pointer rel flex row-center-center pointer");
    			add_location(label, file, 65, 5, 1852);
    			attr_dev(form, "action", "https://tinyletter.com/libinter");
    			attr_dev(form, "method", "post");
    			attr_dev(form, "class", "flex row-flex-start-center wrap cmb0-5");
    			attr_dev(form, "target", "popupwindow");
    			attr_dev(form, "onsubmit", "window.open('https://tinyletter.com/libinter', 'popupwindow', 'scrollbars=yes,width=800,height=600');return true");
    			add_location(form, file, 51, 4, 1347);
    			attr_dev(article, "class", "cmb1 plr0-5");
    			add_location(article, file, 23, 2, 432);
    			attr_dev(div1, "class", "maxw28em cmb1 p1 mb2");
    			set_style(div1, "line-height", "1.6em");
    			add_location(div1, file, 8, 1, 97);
    			attr_dev(main, "class", "sassis flex row-center-center bright minh100vh f2 serif");
    			add_location(main, file, 5, 0, 22);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div1);
    			append_dev(div1, header);
    			append_dev(header, div0);
    			append_dev(div0, h1);
    			append_dev(h1, span0);
    			append_dev(h1, t1);
    			append_dev(h1, img);
    			append_dev(div1, t2);
    			append_dev(div1, article);
    			append_dev(article, p0);
    			append_dev(p0, span1);
    			append_dev(p0, t4);
    			append_dev(p0, a0);
    			append_dev(p0, t6);
    			append_dev(article, t7);
    			append_dev(article, h20);
    			append_dev(article, t9);
    			append_dev(article, ul);
    			append_dev(ul, li0);
    			append_dev(li0, t10);
    			append_dev(li0, a1);
    			append_dev(ul, t12);
    			append_dev(ul, li1);
    			append_dev(li1, t13);
    			append_dev(li1, a2);
    			append_dev(article, t15);
    			append_dev(article, h21);
    			append_dev(article, t17);
    			append_dev(article, p1);
    			append_dev(p1, t18);
    			append_dev(p1, a3);
    			append_dev(p1, t20);
    			append_dev(article, t21);
    			append_dev(article, form);
    			append_dev(form, input0);
    			append_dev(form, t22);
    			append_dev(form, input1);
    			append_dev(form, t23);
    			append_dev(form, label);
    			append_dev(label, a4);
    			append_dev(label, t25);
    			append_dev(label, input2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
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

    function instance($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

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
