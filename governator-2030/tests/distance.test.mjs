import test from 'node:test';
import assert from 'node:assert/strict';
import {distanceKm} from '../shared/distance.mjs';
import {createJourneyEngine} from '../shared/journey.mjs';
test('distance uses geographic coordinates and is symmetric',()=>{const a={lat:48.2,lon:16.3},b={lat:48.21,lon:16.3};assert.equal(distanceKm(a,a),0);assert.ok(Math.abs(distanceKm(a,b)-1.112)<.01);assert.equal(distanceKm(a,b),distanceKm(b,a))});
test('agent gets home distances, pairwise distances and nearest provider; map includes home',async()=>{const e=createJourneyEngine();await e.call('get_journey',{journey_id:'drivers_license'});const r=await e.call('find_services',{service_type:'school'});assert.equal(r.home.label,'Your home');assert.equal(r.closest_provider_id,r.services[0].id);assert.ok(r.services.every((p,i,all)=>p.distance_km>=0&&(!i||p.distance_km>=all[i-1].distance_km)));assert.equal(r.distances_between_providers.length,3);const map=await e.call('show_map',{selection_key:'school_id',markers:r.services.map(p=>({provider_id:p.id}))});assert.deepEqual(map.displayed.home,r.home)});
