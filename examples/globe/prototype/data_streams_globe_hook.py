if os.environ.get("GLOBE_EXPLORER"):  # an interactive page for exploring views; not part of the build
    import jax.numpy as jnp

    from globe_explorer import write_explorer

    _gamma = jnp.linspace(-0.95, 0.95, 500)  # as ridgeline_sky_stats
    _cases = {"Particle spray": SPRAY, "$N$-body": NBODY}
    _orbit_xyz = {"Orbit 1": orbits["xyz_circ_kpc"], "Orbit 2": orbits["xyz_ellip_kpc"]}
    _explorer_streams = []
    for _name, _s in STREAMS.items():
        if _name in _cases:  # the track's own derivatives; the curvature vector is parallel to q''
            _t = _cases[_name].track
            _pos, _d1, _d2 = (np.asarray(f(_gamma)) for f in (_t.positions, _t.tangent, _t.curvature))
            _pts = _cases[_name].particles[rng.choice(len(_cases[_name].particles), 6000, replace=False)]
        else:  # the orbits are saved as positions only; finite differences reproduce step 1's masks
            _pos = _orbit_xyz[_name]
            _d1 = np.gradient(_pos, axis=0)
            _d2, _pts = np.gradient(_d1, axis=0), np.zeros((0, 3))
        _T = np.stack([sim_frame(_e, _name) for _e in np.eye(3)], axis=1)  # (a,b,c) -> simulation
        _explorer_streams.append({
            "name": _name, "color": _s["color"],
            "view": _T.T @ view_vector(*THETA_PHI[_name]),  # the paper's own end, not the drawn antipode
            "T": _T,
            "pos": _pos, "d1": _d1, "d2": _d2, "points": _pts,
            "panel_rot_deg": -45.0 if _name == "Orbit 2" else 0.0,
        })
    _th, _ph = np.meshgrid(np.linspace(0, np.pi, 181), np.linspace(0, 2 * np.pi, 361), indexing="ij")
    write_explorer(
        paths.data / "derived" / "globe_explorer.html",
        _explorer_streams,
        region_colors(np.stack([np.sin(_th) * np.cos(_ph), np.sin(_th) * np.sin(_ph), np.cos(_th)], -1)),
        np.stack(camera_basis(np.array(LAYOUT["elev"]), np.array(LAYOUT["azim"])))[[1, 2, 0]],
        R_GLOBE, RADIAL_POWER, CAP_DEG,
    )
