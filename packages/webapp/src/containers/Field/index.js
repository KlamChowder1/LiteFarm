/* 
 *  Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>   
 *  This file (index.js) is part of LiteFarm.
 *  
 *  LiteFarm is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *  
 *  LiteFarm is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details, see <https://www.gnu.org/licenses/>.
 */

import React, { Component } from "react";
import GoogleMap from 'google-map-react';
import { connect } from 'react-redux';
import styles from './styles.scss';
import { Button, Tabs, Tab, Table, Glyphicon } from 'react-bootstrap';
import {fieldSelector, cropSelector as fieldCropSelector, farmSelector} from "../selector";
import history from '../../history';
import moment from 'moment';
import { getFields } from '../actions';
import { CENTER, DEFAULT_ZOOM, FARM_BOUNDS, GMAPS_API_KEY, TREE_ICON} from './constants';
import {convertFromMetric, getUnit, roundToTwoDecimal} from "../../util";

class Field extends Component {
  static defaultProps = {
    center: CENTER,
    zoom: DEFAULT_ZOOM,
    bounds: FARM_BOUNDS,
  };

  constructor(props) {
    super(props);
    this.state = {
      cropFilter: 'all',
      fieldFilter: 'all',
      startDate: moment([2009, 0, 1]),
      endDate: moment(),
      selectedTab: 2,
      map: null, //discuss usage
      isVisible: [],
      maps: null,
      isMapLoaded: false,
      area_unit: getUnit(this.props.farm, 'm2', 'ft2'),
      area_unit_label: getUnit(this.props.farm, 'm', 'ft'),
      showListSearchBar: true,
      center: CENTER,
    };

    this.handleSelectTab = this.handleSelectTab.bind(this);
    this.handleGoogleMapApi = this.handleGoogleMapApi.bind(this);
    this.handleSearchTermChange = this.handleSearchTermChange.bind(this);

  }
  componentDidMount() {
    const { dispatch } = this.props;
    dispatch(getFields());
    var visArray = [];
    if(this.props.fields){
      for(var i = 0; i < this.props.fields.length; i++){
        visArray.push(true);
      }
      this.setState({isVisible: visArray});
    }
  }

  handleSelectTab(selectedTab) {
    let showListSearchBar = selectedTab === 2;
    this.setState({ selectedTab, showListSearchBar });
  }

  handleGoogleMapApi(map, maps) {
    let farmBounds = new maps.LatLngBounds();
    let len = 0;
    let fieldIcon = {
      path: TREE_ICON,
      fillColor: styles.primaryColor,
      fillOpacity: 0,
      strokeWeight: 0,
      scale: 0.5,
    };

    maps.Polygon.prototype.getPolygonBounds = function () {
      var bounds = new maps.LatLngBounds();
      this.getPath().forEach(function (element, index) {
        bounds.extend(element);
      })
      return bounds;
    };


    let addListenersOnPolygonAndMarker = function (polygon, fieldObject) {

        // creates field marker
        var fieldMarker = new maps.Marker({
          position: polygon.getPolygonBounds().getCenter(),
          map: map,
          icon: fieldIcon,
          label: { text: fieldObject.field_name, color: 'white'}
        });

        // attach on click listeners
        //activeInfoWindow = null;

        function pushToHist(){
          history.push("./edit_field?"+fieldObject.field_id);
        }



        fieldMarker.setMap(map);

        maps.event.addListener(fieldMarker, 'click', function (event) {
          pushToHist();

        });
        maps.event.addListener(polygon, 'click', function (event) {
          pushToHist();
        });

    }

    if (this.props.fields && this.props.fields.length >= 1) {
      len = this.props.fields.length;
      let i;

      for (i = 0; i < len; i++) {
        // ensure that the map shows this field
        farmBounds.extend(this.props.fields[i].grid_points[0]);
        // creates the polygon to be displayed on the map
        var polygon = new maps.Polygon({
          paths: this.props.fields[i].grid_points,
          strokeColor: styles.primaryColor,
          strokeOpacity: 0.8,
          strokeWeight: 3,
          fillColor: styles.primaryColor,
          fillOpacity: 0.35
        });
        polygon.setMap(map);

        addListenersOnPolygonAndMarker(polygon, this.props.fields[i]);

      }
      map.fitBounds(farmBounds);
      map.setZoom(14);
    }
    this.setState({
      map,
      maps,
      isMapLoaded: true,
    });
  }

  handleSearchTermChange = (e) => {
    const searchTerm = e.target.value;
    var newVisStatus = [];
    for (var i = 0; i < this.props.fields.length; i++){
      var field = this.props.fields[i];
      if (String(field.field_name).toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase())) {
        newVisStatus.push(true);
      }else{
        newVisStatus.push(false);
      }
    }
    this.setState({isVisible: newVisStatus});

  }

  getMapOptions = (maps) => {

    return {
      streetViewControl: false,
      scaleControl: true,
      fullscreenControl: false,
      styles: [{
        featureType: "poi.business",
        elementType: "labels",
        stylers: [{
          visibility: "off"
        }]
      }],
      gestureHandling: "greedy",
      disableDoubleClickZoom: true,
      minZoom: 1,
      maxZoom: 80,
      tilt: 0,
      center: this.state.center,
      zoom: DEFAULT_ZOOM,
      bounds: FARM_BOUNDS,
      size: { width: 100, height: 100 },
      mapTypeControl: true,
      mapTypeId: maps.MapTypeId.SATELLITE,
      mapTypeControlOptions: {
        style: maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: maps.ControlPosition.BOTTOM_CENTER,
        mapTypeIds: [
          maps.MapTypeId.ROADMAP,
          maps.MapTypeId.SATELLITE,
          maps.MapTypeId.HYBRID
        ]
      },
      zoomControl: true,
      clickableIcons: false
    };
  }

  render() {
    //UBC Farm Title
    const CenterDiv = ({ text }) => <div style={{ width: '30px', color: 'white', fontWeight: 'bold', fontSize: '16px', }}>{text}</div>;
    return (
      <div className={styles.logContainer}>
        <h4>
          <strong>FIELDS</strong>
        </h4>
        <hr />
        <h4><b>Action</b></h4>
        <div className={styles.buttonContainer}>
          <Button onClick={() => {history.push('/new_field') }}>Add New Field</Button>
        </div>
        <hr />
        <h4><b>Explore Your Fields</b></h4>
        <div>
          <Tabs
            activeKey={this.state.selectedTab}
            onSelect={this.handleSelectTab}
            id="controlled-tab-example"
          >
            <Tab eventKey={1} title="Map">
              <div style={{ width: "100%", height: "400px" }}>
                <GoogleMap
                  bootstrapURLKeys={{
                    key: GMAPS_API_KEY,
                    libraries: ['drawing', 'geometry', 'places']}}
                  center={this.props.center}
                  zoom={this.props.zoom}
                  yesIWantToUseGoogleMapApiInternals
                  onGoogleApiLoaded={({ map, maps }) => this.handleGoogleMapApi(map, maps)}
                  options={this.getMapOptions}
                >

                  <CenterDiv
                    lat={CENTER.lat}
                    lng={CENTER.lng}
                    text={'UBC Farm'}
                  />
                </GoogleMap>
              </div>
            </Tab>
            <Tab eventKey={2} title="List">
              <Table>
                <thead>
                  <tr>
                    <th>Field Name <span className="glyphicon glyphicon-chevron-down" /></th>
                    <th>Area <span className="glyphicon glyphicon-chevron-down" /></th>
                    <th>Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {this.props.fields && (this.props.fields.map((field,index) => {return this.state.isVisible[index] === false ? null : (
                    <tr key={field.field_id}>
                      <td>{field.field_name}</td>
                      <td>{roundToTwoDecimal(convertFromMetric(field.area, this.state.area_unit, 'm2'))} {this.state.area_unit_label}<sup>2</sup></td>
                      <td>
                        <a onClick={() => {history.push('./edit_field?' + field.field_id)}}><Glyphicon glyph="chevron-right" style={{color:'#349289'}}/></a>
                      </td>
                    </tr>
                  );}

                  ))}
                </tbody>
              </Table>
            </Tab>
          </Tabs>
        </div>
      </div>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    fields: fieldSelector(state),
    fieldCrops: fieldCropSelector(state),
    farm: farmSelector(state),
  }
};

const mapDispatchToProps = (dispatch) => {
  return {
    dispatch
  }
};

export default connect(mapStateToProps, mapDispatchToProps)(Field);
