"""V5 Phase 0: detect real hardware + audit V4 artifacts. Writes v5_hardware_profile.json."""
import json, shutil, platform
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).parent.resolve()
out = {'timestamp': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}

# CPU/RAM/disk
import psutil
vm = psutil.virtual_memory()
du = shutil.disk_usage(str(ROOT))
out['cpu'] = {'model': platform.processor() or platform.machine(),
              'logical': psutil.cpu_count(logical=True), 'physical': psutil.cpu_count(logical=False)}
out['ram'] = {'total_gb': round(vm.total / 1e9, 2), 'available_gb': round(vm.available / 1e9, 2)}
out['disk'] = {'total_gb': round(du.total / 1e9, 2), 'free_gb': round(du.free / 1e9, 2)}
out['storage_cap_gb'] = round(du.free / 1e9 * 0.6, 2)

# GPU
out['gpu'] = {'present': False}
try:
    import torch
    out['torch_version'] = torch.__version__
    if torch.cuda.is_available():
        i = 0
        p = torch.cuda.get_device_properties(i)
        out['gpu'] = {'present': True, 'name': p.name, 'total_vram_gb': round(p.total_memory / 1e9, 2),
                      'cuda_capability': list(p.major_minor) if hasattr(p, 'major_minor') else [p.major, p.minor],
                      'multiprocessor_count': p.multi_processor_count}
        free, total = torch.cuda.mem_get_info(i)
        out['gpu']['free_vram_gb'] = round(free / 1e9, 2)
    else:
        out['gpu'] = {'present': False, 'reason': 'torch.cuda.is_available()=False'}
except Exception as e:
    out['gpu'] = {'present': False, 'reason': f'{type(e).__name__}: {e}'}

# batch guidance
vram = out['gpu'].get('total_vram_gb', 0)
out['batch_guidance'] = {'effnet_b2_256': 48 if vram >= 7 else (24 if vram >= 4 else 8),
                         'amp': bool(out['gpu']['present'])}

# V4 artifact audit (reality check against mission premise)
audit = {}
for name in ['ziria_v4_calibrated.pt', 'v4_metrics_report.json', 'v4_best.pt', 'v4_ckpt.pt',
             'v4_run.log', 'v4_calibration_pipeline.py']:
    p = ROOT / name
    audit[name] = {'exists': p.exists(), 'bytes': p.stat().st_size if p.exists() else 0}
try:
    rep = json.loads((ROOT / 'v4_metrics_report.json').read_text())
    audit['v4_report_summary'] = {
        'n_classes': rep.get('n_classes'), 'classes_sample': (rep.get('classes') or [])[:5],
        'test_acc_all': rep.get('test_acc_all'), 'test_acc_field': rep.get('test_acc_field'),
        'temperature_Tstar': rep.get('temperature_Tstar'),
        'val_ece_before': rep.get('val_ece_before'), 'val_ece_after': rep.get('val_ece_after'),
        'counts': rep.get('counts'), 'sources': rep.get('sources')}
    cls = rep.get('classes') or []
    bare_crops = [c for c in cls if '_' not in c]
    audit['v4_taxonomy_check'] = {'n': len(cls), 'bare_crop_names': bare_crops,
                                 'disease_level': len(bare_crops) == 0}
except Exception as e:
    audit['v4_report_summary'] = f'UNREADABLE: {e}'
out['v4_audit'] = audit

# calibrated-pt class count probe (state_dict classifier shape)
try:
    import torch as _t
    sd = _t.load(str(ROOT / 'v4_best.pt'), map_location='cpu')
    if isinstance(sd, dict) and 'classifier.weight' not in sd:
        cands = [k for k in sd.keys() if 'classifier' in k and 'weight' in k]
        audit['v4_best_classifier_keys'] = cands[:4]
        if cands:
            audit['v4_best_num_classes'] = list(sd[cands[0]].shape)
    elif isinstance(sd, dict) and 'classifier.weight' in sd:
        audit['v4_best_num_classes'] = list(sd['classifier.weight'].shape)
    else:
        audit['v4_best_format'] = type(sd).__name__
except Exception as e:
    audit['v4_best_probe'] = f'ERR {e}'

(ROOT / 'v5_hardware_profile.json').write_text(json.dumps(out, indent=2))
print(json.dumps(out, indent=2))
