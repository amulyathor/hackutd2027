"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  CBREFacilityNode,
  InvisibleDependencyEdge,
  RackNode,
  StabilityClusterType,
} from "@/lib/datacenter-twin";

interface DataHall3DCanvasProps {
  racks: RackNode[];
  facilityNodes: CBREFacilityNode[];
  dependencyEdges: InvisibleDependencyEdge[];
  selectedRackId: string;
  onSelectRack: (rackId: string) => void;
  visualMode: "CLUSTER_STABILITY" | "REPLACEMENT_XRAY" | "THERMAL_HEATMAP";
  showInvisibleNetwork: boolean;
  nemotronMitigated: boolean;
}

// Strict 3-color semantic palette: Green (Healthy), Amber (Transient Drift), Red (Hardware Swap / Breach)
function getClusterColorHex(
  rack: RackNode,
  mode: "CLUSTER_STABILITY" | "REPLACEMENT_XRAY" | "THERMAL_HEATMAP"
): number {
  if (mode === "REPLACEMENT_XRAY") {
    if (rack.replacementRecommended) return 0xef4444; // Red: Intrinsic hardware swap required
    if (rack.stabilityCluster === "TRANSIENT_THERMAL_DRIFT") return 0xf59e0b; // Amber: Transient drift
    return 0x1e293b; // Neutral Slate: Dimmed healthy rack
  }

  if (mode === "THERMAL_HEATMAP") {
    if (rack.coolantTempC >= 43 || rack.replacementRecommended) return 0xef4444; // Red
    if (rack.coolantTempC >= 35) return 0xf59e0b; // Amber
    return 0x10b981; // Green
  }

  const map: Record<StabilityClusterType, number> = {
    HEALTHY_OPTIMAL: 0x10b981, // Green
    TRANSIENT_THERMAL_DRIFT: 0xf59e0b, // Amber
    HARDWARE_SWAP_REQUIRED: 0xef4444, // Red
  };
  return map[rack.stabilityCluster] || 0x10b981;
}

export default function DataHall3DCanvas({
  racks,
  facilityNodes,
  selectedRackId,
  onSelectRack,
  visualMode,
  showInvisibleNetwork,
  nemotronMitigated,
}: DataHall3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [hoveredRack, setHoveredRack] = useState<RackNode | null>(null);
  const [cameraPreset, setCameraPreset] = useState<
    "OVERVIEW" | "CLUSTER_BC" | "REPLACEMENT" | "TOP"
  >("OVERVIEW");

  const racksRef = useRef<RackNode[]>(racks);
  racksRef.current = racks;
  const selectedIdRef = useRef<string>(selectedRackId);
  selectedIdRef.current = selectedRackId;
  const modeRef = useRef(visualMode);
  modeRef.current = visualMode;
  const showNetworkRef = useRef(showInvisibleNetwork);
  showNetworkRef.current = showInvisibleNetwork;

  const sphericalRef = useRef({
    radius: 23,
    theta: 0.62,
    phi: 0.98,
    target: new THREE.Vector3(0, 0.8, 0),
  });

  const applyCameraPreset = (
    preset: "OVERVIEW" | "CLUSTER_BC" | "REPLACEMENT" | "TOP"
  ) => {
    setCameraPreset(preset);
    if (preset === "OVERVIEW") {
      sphericalRef.current = {
        radius: 23,
        theta: 0.62,
        phi: 0.98,
        target: new THREE.Vector3(0, 0.8, 0),
      };
    } else if (preset === "CLUSTER_BC") {
      sphericalRef.current = {
        radius: 15,
        theta: -0.45,
        phi: 0.92,
        target: new THREE.Vector3(2.5, 1.0, 0),
      };
    } else if (preset === "REPLACEMENT") {
      sphericalRef.current = {
        radius: 13.5,
        theta: 0.25,
        phi: 0.85,
        target: new THREE.Vector3(1.2, 1.1, 0.5),
      };
    } else if (preset === "TOP") {
      sphericalRef.current = {
        radius: 25,
        theta: 0.01,
        phi: 0.22,
        target: new THREE.Vector3(0, 0, 0),
      };
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 510;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060a12);
    scene.fog = new THREE.FogExp2(0x060a12, 0.018);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xe2e8f0, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xf8fafc, 1.15);
    dirLight1.position.set(15, 24, 14);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x94a3b8, 0.7);
    dirLight2.position.set(-16, 18, -12);
    scene.add(dirLight2);

    // Neutral Slate Floor Grid
    const gridHelper = new THREE.GridHelper(34, 34, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -0.02;
    scene.add(gridHelper);

    const floorGeo = new THREE.PlaneGeometry(34, 24);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x080c16,
      roughness: 0.88,
      metalness: 0.15,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.05;
    scene.add(floorMesh);

    // Subtle neutral slate zone pads for Clusters A, B, C, D
    const clusterPads = [
      { id: "CLUSTER-A", x: -4.8, z: -3.6 },
      { id: "CLUSTER-B", x: 4.8, z: -3.6 },
      { id: "CLUSTER-C", x: -4.8, z: 3.6 },
      { id: "CLUSTER-D", x: 4.8, z: 3.6 },
    ];
    clusterPads.forEach((pad) => {
      const padGeo = new THREE.PlaneGeometry(9.2, 6.2);
      const padMat = new THREE.MeshBasicMaterial({
        color: 0x1e293b,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
      });
      const padMesh = new THREE.Mesh(padGeo, padMat);
      padMesh.rotation.x = -Math.PI / 2;
      padMesh.position.set(pad.x, 0.01, pad.z);
      scene.add(padMesh);

      const borderGeo = new THREE.EdgesGeometry(padGeo);
      const borderMat = new THREE.LineBasicMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.5,
      });
      const borderLine = new THREE.LineSegments(borderGeo, borderMat);
      borderLine.rotation.x = -Math.PI / 2;
      borderLine.position.set(pad.x, 0.02, pad.z);
      scene.add(borderLine);
    });

    const rackGroupsMap = new Map<
      string,
      {
        group: THREE.Group;
        frameMat: THREE.MeshStandardMaterial;
        topBeaconMat: THREE.MeshBasicMaterial;
        selectionRingMat: THREE.MeshBasicMaterial;
        bladeMeshes: { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial }[];
        hitBox: THREE.Mesh;
      }
    >();

    const interactableMeshes: THREE.Object3D[] = [];

    racksRef.current.forEach((rack) => {
      const group = new THREE.Group();
      group.position.set(rack.position3D[0], 0, rack.position3D[2]);

      const cabinetGeo = new THREE.BoxGeometry(1.35, 2.75, 1.55);
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.7,
        roughness: 0.35,
        emissive: 0x000000,
        emissiveIntensity: 0.2,
      });
      const cabinetMesh = new THREE.Mesh(cabinetGeo, frameMat);
      cabinetMesh.position.y = 1.375;
      group.add(cabinetMesh);

      const edgesGeo = new THREE.EdgesGeometry(cabinetGeo);
      const edgesMat = new THREE.LineBasicMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.65,
      });
      const edgesLine = new THREE.LineSegments(edgesGeo, edgesMat);
      edgesLine.position.y = 1.375;
      group.add(edgesLine);

      const bladeMeshes: {
        mesh: THREE.Mesh;
        mat: THREE.MeshStandardMaterial;
      }[] = [];
      for (let b = 0; b < 8; b++) {
        const bladeGeo = new THREE.BoxGeometry(1.18, 0.22, 1.42);
        const bladeMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x10b981,
          emissiveIntensity: 0.5,
          metalness: 0.45,
          roughness: 0.3,
        });
        const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
        bladeMesh.position.set(0, 0.28 + b * 0.3, 0.08);
        group.add(bladeMesh);
        bladeMeshes.push({ mesh: bladeMesh, mat: bladeMat });
      }

      const beaconGeo = new THREE.BoxGeometry(1.25, 0.12, 1.45);
      const topBeaconMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
      });
      const beaconMesh = new THREE.Mesh(beaconGeo, topBeaconMat);
      beaconMesh.position.y = 2.82;
      group.add(beaconMesh);

      const ringGeo = new THREE.RingGeometry(0.95, 1.18, 32);
      const selectionRingMat = new THREE.MeshBasicMaterial({
        color: 0xf8fafc,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.0,
      });
      const ringMesh = new THREE.Mesh(ringGeo, selectionRingMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.03;
      group.add(ringMesh);

      const hitGeo = new THREE.BoxGeometry(1.5, 3.0, 1.7);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitBox = new THREE.Mesh(hitGeo, hitMat);
      hitBox.position.y = 1.5;
      hitBox.userData = { rackId: rack.id };
      group.add(hitBox);
      interactableMeshes.push(hitBox);

      scene.add(group);
      rackGroupsMap.set(rack.id, {
        group,
        frameMat,
        topBeaconMat,
        selectionRingMat,
        bladeMeshes,
        hitBox,
      });
    });

    // CBRE Facility Dependency Beams (Strict semantic colors: Red for failing/swap, Amber for warning, Green for nominal)
    const networkGroup = new THREE.Group();
    scene.add(networkGroup);

    facilityNodes.forEach((fNode) => {
      const nodeGeo = new THREE.OctahedronGeometry(0.62, 1);
      const nodeColor =
        fNode.status === "FAILING"
          ? 0xef4444
          : fNode.status === "WARNING"
          ? 0xf59e0b
          : 0x10b981;
      const nodeMat = new THREE.MeshStandardMaterial({
        color: nodeColor,
        emissive: nodeColor,
        emissiveIntensity: 0.6,
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.set(
        fNode.position3D[0],
        fNode.position3D[1],
        fNode.position3D[2]
      );
      networkGroup.add(nodeMesh);

      racksRef.current.forEach((rack) => {
        if (
          fNode.connectedRackClusters.includes(rack.clusterId) &&
          rack.stabilityCluster !== "HEALTHY_OPTIMAL"
        ) {
          const points = [
            new THREE.Vector3(
              fNode.position3D[0],
              fNode.position3D[1],
              fNode.position3D[2]
            ),
            new THREE.Vector3(
              (fNode.position3D[0] + rack.position3D[0]) * 0.5,
              3.8,
              (fNode.position3D[2] + rack.position3D[2]) * 0.5
            ),
            new THREE.Vector3(rack.position3D[0], 2.85, rack.position3D[2]),
          ];
          const curve = new THREE.QuadraticBezierCurve3(
            points[0],
            points[1],
            points[2]
          );
          const lineGeo = new THREE.BufferGeometry().setFromPoints(
            curve.getPoints(22)
          );
          const lineMat = new THREE.LineBasicMaterial({
            color: rack.replacementRecommended ? 0xef4444 : 0xf59e0b,
            transparent: true,
            opacity: 0.42,
          });
          const curveLine = new THREE.Line(lineGeo, lineMat);
          networkGroup.add(curveLine);
        }
      });
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let isDragging = false;
    let pointerDownPos = { x: 0, y: 0 };
    let prevPointerPos = { x: 0, y: 0 };

    const handlePointerDown = (e: MouseEvent) => {
      isDragging = true;
      pointerDownPos = { x: e.clientX, y: e.clientY };
      prevPointerPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const dx = e.clientX - prevPointerPos.x;
        const dy = e.clientY - prevPointerPos.y;
        prevPointerPos = { x: e.clientX, y: e.clientY };

        sphericalRef.current.theta -= dx * 0.0065;
        sphericalRef.current.phi = Math.max(
          0.18,
          Math.min(
            Math.PI / 2 - 0.08,
            sphericalRef.current.phi - dy * 0.0065
          )
        );
        return;
      }

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(interactableMeshes, false);
      if (intersects.length > 0) {
        const hitRackId = intersects[0].object.userData?.rackId;
        const found =
          racksRef.current.find((r) => r.id === hitRackId) || null;
        setHoveredRack(found);
        renderer.domElement.style.cursor = "pointer";
      } else {
        setHoveredRack(null);
        renderer.domElement.style.cursor = "grab";
      }
    };

    const handlePointerUp = (e: MouseEvent) => {
      if (!isDragging) return;
      isDragging = false;
      const moveDist = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y
      );
      if (moveDist < 6) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(
          interactableMeshes,
          false
        );
        if (intersects.length > 0) {
          const hitRackId = intersects[0].object.userData?.rackId;
          if (hitRackId) onSelectRack(hitRackId);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      sphericalRef.current.radius = Math.max(
        9,
        Math.min(36, sphericalRef.current.radius + e.deltaY * 0.015)
      );
    };

    const domElem = renderer.domElement;
    domElem.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    domElem.addEventListener("wheel", handleWheel, { passive: false });

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 900;
      const h = container.clientHeight || 510;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    let animFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      const { radius, theta, phi, target } = sphericalRef.current;
      camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = target.y + radius * Math.cos(phi);
      camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(target);

      networkGroup.visible = showNetworkRef.current;

      const currentMode = modeRef.current;
      const currentSelected = selectedIdRef.current;

      racksRef.current.forEach((rack) => {
        const item = rackGroupsMap.get(rack.id);
        if (!item) return;

        const baseHex = getClusterColorHex(rack, currentMode);
        const isSelected = rack.id === currentSelected;
        const isSwapRequired = rack.replacementRecommended;

        const pulse = isSwapRequired
          ? 0.55 + 0.45 * Math.sin(elapsed * 5.0)
          : 0.65;

        item.topBeaconMat.color.setHex(baseHex);
        item.frameMat.emissive.setHex(baseHex);
        item.frameMat.emissiveIntensity = isSelected
          ? 0.45
          : isSwapRequired
          ? pulse * 0.3
          : 0.1;

        item.selectionRingMat.opacity = isSelected ? 0.95 : 0.0;

        rack.blades.forEach((blade, bIdx) => {
          const bladeObj = item.bladeMeshes[bIdx];
          if (!bladeObj) return;

          if (currentMode === "REPLACEMENT_XRAY") {
            if (blade.needsReplacement) {
              bladeObj.mat.color.setHex(0xef4444);
              bladeObj.mat.emissive.setHex(0xef4444);
              bladeObj.mat.emissiveIntensity =
                0.8 + 0.3 * Math.sin(elapsed * 5.5);
              bladeObj.mesh.position.z = 0.42 + 0.05 * Math.sin(elapsed * 4);
            } else {
              bladeObj.mat.color.setHex(0x1e293b);
              bladeObj.mat.emissive.setHex(0x0f172a);
              bladeObj.mat.emissiveIntensity = 0.12;
              bladeObj.mesh.position.z = 0.08;
            }
          } else {
            const bladeHex = blade.needsReplacement ? 0xef4444 : baseHex;
            bladeObj.mat.color.setHex(bladeHex);
            bladeObj.mat.emissive.setHex(bladeHex);
            bladeObj.mat.emissiveIntensity = blade.needsReplacement
              ? 0.85
              : 0.42;
            bladeObj.mesh.position.z = blade.needsReplacement ? 0.22 : 0.08;
          }
        });
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameId);
      domElem.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      domElem.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, [facilityNodes, onSelectRack]);

  return (
    <div className="relative w-full h-[510px] rounded-2xl overflow-hidden border border-slate-800 bg-[#060a12]">
      <div ref={mountRef} className="w-full h-full" />

      {/* Top-Left Overlay: Strict 3-State Semantic Legend */}
      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            Healthy / Optimal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            Transient Facility Drift (Recoverable)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            Hardware Swap Required / SLA Risk
          </span>
        </div>

        {nemotronMitigated && (
          <div className="bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Cascade Mitigated: Auxiliary Cooling & Workload Drain Active
          </div>
        )}
      </div>

      {/* Bottom-Left Overlay: Camera Preset Buttons */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5">
        {(
          [
            { id: "OVERVIEW", label: "Isometric Hall" },
            { id: "CLUSTER_BC", label: "Focus Clusters B & C" },
            { id: "REPLACEMENT", label: "Blade Swap X-Ray" },
            { id: "TOP", label: "Top-Down Map" },
          ] as const
        ).map((btn) => (
          <button
            key={btn.id}
            onClick={() => applyCameraPreset(btn.id)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition border ${
              cameraPreset === btn.id
                ? "bg-slate-800 border-slate-600 text-white"
                : "bg-slate-950/85 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Bottom-Right Overlay: Live Hover Tooltip */}
      {hoveredRack && (
        <div className="absolute bottom-3 right-3 w-72 bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-xl p-3 text-xs text-slate-200 shadow-2xl pointer-events-none">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <span className="font-bold text-white">{hoveredRack.label}</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                hoveredRack.replacementRecommended
                  ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                  : hoveredRack.stabilityCluster === "TRANSIENT_THERMAL_DRIFT"
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
              }`}
            >
              Health {hoveredRack.healthScore}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300 mb-1.5">
            <div>
              <span className="text-slate-500">Coolant:</span>{" "}
              {hoveredRack.coolantTempC}°C
            </div>
            <div>
              <span className="text-slate-500">Flow:</span>{" "}
              {hoveredRack.coolantFlowLpm} L/m
            </div>
            <div>
              <span className="text-slate-500">Peak Ripple:</span>{" "}
              {hoveredRack.voltageRippleMv} mV
            </div>
            <div>
              <span className="text-slate-500">ECC Rate:</span>{" "}
              {hoveredRack.totalEccErrorsPerHr}/hr
            </div>
          </div>
          {hoveredRack.replacementRecommended && (
            <div className="bg-rose-950/40 border border-rose-500/30 rounded-lg p-1.5 text-[11px] text-rose-200">
              <strong className="text-rose-400">Swap Required:</strong>{" "}
              {hoveredRack.replacementDiagnosis}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
