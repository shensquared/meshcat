'use strict';


class SceneNode {
    constructor(object, folder) {
        this.object = object;
        this.folder = folder;
        this.children = {};
        this.create_controls();
    }

    create_child(name) {
        let obj = new THREE.Object3D();
        let f = this.folder.addFolder(name);
        f.add(obj, "visible");
        let node = new SceneNode(obj, f);
        this.children[name] = node;
        return node;
    }

    find(path) {
        if (path.length == 0) {
            return this;
        } else {
            let name = path[0];
            let child = this.children[name];
            if (child === undefined) {
                child = this.create_child(name);
            }
            return child.find(path.slice(1));
        }
    }
}

var gui = new dat.GUI();
var scene_folder = gui.addFolder("Scene");
scene_folder.open();

function update_gui(path) {
    if (path === undefined) {
        path = [];
    }
    let object = find_scene_object(path);
    let folder = find_gui_folder(path);
    remove_folders(folder);
    traverse_gui(folder, object);

    // let v = folder.add(object, "visible");
    // if (object.children.length == 0) {
    //     remove_folders(folder);
    // }
}

function find_gui_folder(path, root) {
    if (root === undefined) {
        root = scene_folder;
    }
    if (path.length == 0) {
        return root;
    } else {
        let child_folder = root.__folders[path[0]];
        if (child_folder === undefined) {
            child_folder = root.addFolder(path[0]);
        }
        return find_gui_folder(path.slice(1), child_folder);
    }

}


// function build_gui(root_object, path) {

// }

// function build_gui(root_object, path) {
//     if (gui !== undefined) {
//         remove_folders(gui);
//     } else {
//         gui = new dat.GUI();
//     }
//     let folder = gui.addFolder("Scene");
//     folder.open();
//     traverse_gui(folder, root_object);
//     return gui;
// }

function material_gui(gui, material) {
    gui.addColor(material, "color");
    "reflectivity" in material && gui.add(material, "reflectivity");
    "transparent" in material && gui.add(material, "transparent");
    "opacity" in material && gui.add(material, "opacity", 0, 1, 0.01);
    "emissive" in material && gui.addColor(material, "emissive");
}

function traverse_gui(folder, object) {
    // TODO: This is kind of horrifying. Rather than fix the way
    // dat.gui renders the visibility attribute, I just grab its
    // dom element, then stick that element inside the title of
    // the containing folder. I can then hide the original
    // control. Finally, I add a hook that adds the
    // hidden-scene-element class to the parent so that all
    // nested visibility checkboxes will be disabled.
    let v = folder.add(object, "visible");
    v.domElement.classList.add("visibility-checkbox");
    v.domElement.style.float = "right";
    v.domElement.style.width = 0;
    let parent = v.domElement.parentNode.parentNode;
    parent.style.display = "none";
    let title = parent.previousSibling;
    title.appendChild(v.domElement);
    v.domElement.children[0].addEventListener("change", function(evt) {
        if (evt.target.checked) {
            title.classList.remove("hidden-scene-element");
        } else {
            title.classList.add("hidden-scene-element");
        }
    });
    if (object.children.length > 0) {
        folder.open();
        for (let child_object of object.children) {
            let child_folder = folder.addFolder(child_object.name);
            // child_folder.open();
            traverse_gui(child_folder, child_object);
        }
    }
    if (object.material !== undefined) {
        let f = folder.addFolder("material");
        material_gui(f, object.material);
    }
}

function remove_folders(gui) {
    for (let name of Object.keys(gui.__folders)) {
        let folder = gui.__folders[name];
        remove_folders(folder);
        dat.dom.dom.unbind(window, 'resize', folder.__resizeHandler);
        gui.removeFolder(folder);
    }
}

// function create_options(node, element) {
//     let container = create_element("div", element, {class: "scene-tree-item"});
//     let row = create_element("div", container, {class: "scene-tree-header"});
//     let expander = create_element("div", row, {class: "expansion-control"});
//     if (node.children.length) {
//         expander.addEventListener("click", function() {
//             container.classList.toggle("expanded");
//             container.classList.toggle("collapsed");
//         });
//         container.classList.add("expanded");
//     }
//     let name = create_text(node.name || "<anonymous>", create_element("div", row, {class: "scene-tree-label"}));
//     let visibility = create_element("div", row, {class: "scene-tree-visibility"});
//     create_text("👁", visibility);
//     if (!node.visible) {
//         container.classList.add("hidden");
//     }
//     visibility.addEventListener("click", function() {
//         container.classList.toggle("hidden");
//         node.visible = !container.classList.contains("hidden");
//     });
//     let children = create_element("div", container, {class: "scene-tree-children"})
//     if ("children" in node) {
//         for (let child of node.children) {
//             create_options(child, children);
//         }
//     }
// }


function find_scene_object(path, root) {
    if (root === undefined) {
        root = scene;
    }
    if (path.length > 0) {
        let child = root.children.find(c => c.name == path[0]);
        if (child === undefined) {
            child = new THREE.Object3D();
            child.name = path[0];
            root.add(child);
        }
        return find_scene_object(path.slice(1, path.length + 1), child);
    } else {
        return root;
    }
}

function set_transform(path, matrix) {
    let child = find_scene_object(path);
    let mat = new THREE.Matrix4();
    mat.fromArray(matrix);
    mat.decompose(child.position, child.quaternion, child.scale);
}

function set_property(path, property, value) {
    let obj = find_scene_object(path);
    obj[property] = value;
}

function dispose(object) {
    if (object.geometry) {
        object.geometry.dispose();
    }
    if (object.material) {
        if (object.material.map) {
            object.material.map.dispose();
        }
        object.material.dispose();
    }
}

function dispose_recursive(object) {
    dispose(object);
    for (let child of object.children) {
        dispose_recursive(child);
    }
}

function set_object(path, object) {
    let parent = find_scene_object(path);
    let child = parent.children.find(c => c.name == object.name);
    if (child !== undefined) {
        parent.remove(child);
        dispose(child);
    }
    parent.add(object);
    update_gui(path);
    update_embed();
}

function delete_path(path) {
    let parent = find_scene_object(path.slice(0, path.length - 1));
    let child = parent.children.find(c => c.name == path[path.length - 1]);
    if (child !== undefined) {
        parent.remove(child);
        dispose_recursive(child);
        update_gui(path);
        update_embed();
    }
}

function handle_special_geometry(geom) {
    if (geom.type == "_meshfile") {
        if (geom.format == "obj") {
            let loader = new THREE.OBJLoader2();
            let obj = loader.parse("data:text/plain," + geom.data);
            let loaded_geom = obj.children[0].geometry;
            loaded_geom.uuid = geom.uuid;
            let json = loaded_geom.toJSON();
            for (let child of obj.children) {
                dispose(child);
            }
            return json;
        }
    }
    return geom;
}

function handle_set_object(path, object_data) {
    object_data.geometries = object_data.geometries.map(handle_special_geometry);
    let loader = new THREE.ObjectLoader();
    loader.parse(object_data, function (obj) {
        if (obj.geometry.type == "BufferGeometry") {
            obj.geometry.computeVertexNormals();
        }
        if (obj.name === "") {
            obj.name = "<object>";
        }
        set_object(path, obj);
    });
}

function handle_command(cmd) {
    let path = cmd.path.split("/").filter(x => x.length > 0);
    if (cmd.type == "set_property") {
        set_property(path, cmd.property, cmd.value);
    } else if (cmd.type == "set_transform") {
        set_transform(path, cmd.matrix);
    } else if (cmd.type == "delete") {
        delete_path(path);
    } else if (cmd.type == "set_object") {
        handle_set_object(path, cmd.object);
    }
}

function handle_command_message(message) {
	let data = msgpack.decode(new Uint8Array(message.data));
    handle_command(data);
};

function connect(url) {
    console.log(url);
    let connection = new WebSocket(url);
    connection.binaryType = "arraybuffer";
    connection.onmessage = handle_command_message;
    connection.onclose = function (evt) {
        // TODO: start trying to reconnect
    }
}

function set_3d_pane_size(w, h) {
    if (w === undefined) {
        // w = window.innerWidth;
        w = threejs_pane.offsetWidth;
    }
    if (h === undefined) {
        h = window.innerHeight;
    }
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}


// function create_tree_viewer_root() {
//     let viewer_tree = new THREE.Object3D();
//     viewer_tree.name = "TreeViewer";
//     viewer_tree.rotateX(-Math.PI / 2);
//     scene.add(viewer_tree);
//     return viewer_tree;
// }

var camera = new THREE.PerspectiveCamera(75, 1, 0.01, 100);
var renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
var threejs_pane = document.querySelector("#threejs-pane");
threejs_pane.appendChild(renderer.domElement);
camera.position.set(3, 1, 0);
var controls = new THREE.OrbitControls(camera, threejs_pane);

function create_default_scene() {
    var scene = new THREE.Scene();
    scene.name = "Scene";
    scene.rotateX(-Math.PI / 2);
    var lights = new THREE.Group();
    lights.name = "Lights";
    scene.add(lights);

    var light = new THREE.DirectionalLight(0xffffff, 0.5);
    light.name = "DirectionalLight";
    light.position.set(1, 5, 10);
    lights.add(light);

    var ambient_light = new THREE.AmbientLight(0xffffff, 0.3);
    ambient_light.name = "AmbientLight";
    lights.add(ambient_light);

    var grid = new THREE.GridHelper(20, 40);
    grid.name = "Grid";
    grid.rotateX(Math.PI / 2);
    scene.add(grid);

    var axes = new THREE.AxesHelper(0.5);
    axes.name = "Axes";
    scene.add(axes);

    return scene;
}

var scene = create_default_scene();

window.onload = function (evt) {
    set_3d_pane_size();
}
window.addEventListener('resize', evt => set_3d_pane_size(), false);


function create_element(type, parent, attrs) {
    let element = document.createElement(type);
    if (attrs !== undefined) {
        for (let attr of Object.keys(attrs)) {
            element.setAttribute(attr, attrs[attr]);
        }
    }
    if (parent !== undefined && parent !== null) {
        parent.append(element);
    }
    return element;
}

function create_text(text, parent) {
    let element = document.createTextNode(text);
    if (parent !== undefined) {
        parent.append(element);
    }
    return element;
}


// https://stackoverflow.com/a/35251739
function download_file(name, contents, mime) {
    mime = mime || "text/plain";
    let blob = new Blob([contents], {type: mime});
    let link = document.createElement("a");
    document.body.appendChild(link);
    link.download = name;
    link.href = window.URL.createObjectURL(blob);
    link.onclick = function(e) {
        let scope = this;
        setTimeout(function() {
            window.URL.revokeObjectURL(scope.href);
        }, 1500);
    };
    link.click();
    link.remove();
}

function save_scene() {
    download_file("scene.json", JSON.stringify(scene.toJSON()));
}

function handle_load_file() {
    let file = this.files[0];
    if (!file) {
        return
    }
    let reader = new FileReader();
    reader.onload = function(e) {
        let contents = this.result;
        let json = JSON.parse(contents);
        let loader = new THREE.ObjectLoader();
        scene = loader.parse(json);
        update_gui();
        update_embed();
    };
    reader.readAsText(file);
}

// https://stackoverflow.com/a/26298948
function load_scene() {
    let input = document.createElement("input");
    input.type = "file";
    document.body.appendChild(input);
    input.addEventListener("change", handle_load_file, false);
    input.click();
    input.remove();
}

// create_options(scene, document.getElementById("scene-controls"));
update_gui();

let url = `ws://${location.host}`;
connect(url);

var embed_pending = false;
var embed_enabled = false;

function embed() {
    embed_pending = false;
    let script = document.getElementById("embedded-json");
    script.text = `scene = new THREE.ObjectLoader().parse(JSON.parse(\`${JSON.stringify(scene.toJSON())}\`)); update_gui();`;
}

function update_embed() {
    if (embed_pending || !embed_enabled) {
        return;
    }
    setTimeout(embed, 1000);
}


function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

