/** @flow */

var EventEmitter = require('events').EventEmitter;
var React = require('react/addons');
var invariant = require('react/lib/invariant');
var _ = require('lodash');

var components = [];
document.body.addEventListener('mouseup', () => {
  components.forEach((component, index) => {
    if (!component.isMounted()) {
      components.splice(index, 1);
      return;
    }

    if (!component.state || !component.state._styleState) {
      return;
    }

    Object.keys(component.state._styleState).forEach(key => {
      if (component.state._styleState[key].isMouseDown) {
        _setStyleState(component, key, {isActive: false, isMouseDown: false});
      }
    });
  });
});

function resolveStyles(
  component: any,
  renderedElement: any,
  existingKeyMap?: {[key: string]: bool;}
): any {
  existingKeyMap = existingKeyMap || {};
  if (renderedElement.props.children) {
    React.Children.forEach(
      renderedElement.props.children,
      child => {
        if (React.isValidElement(child)) {
          resolveStyles(component, child, existingKeyMap);
        }
      }
    );
  }

  var props = renderedElement.props;
  var style = props.style;

  if (Array.isArray(style)) {
    props.style = style = styleSet(...style);
  }

  if (!style || !Object.keys(style).some(key => key.indexOf(':') === 0)) {
    return renderedElement;
  }

  var originalKey = renderedElement.ref || renderedElement.key;
  var key = originalKey || 'main';

  invariant(
    !existingKeyMap[key],
    'Cesium requires each element with interactive styles to have a unique ' +
      'key, set using either the ref or key prop. ' +
      (originalKey ?
        'Key "' + originalKey + '" is a duplicate.' :
        'Multiple elements have no key specified.')
  );

  existingKeyMap[key] = true;

  var newStyle = {...style};
  if (style[':hover'] || style[':active']) {
    var existingOnMouseEnter = props.onMouseEnter;
    props.onMouseEnter = (e) => {
      existingOnMouseEnter && existingOnMouseEnter(e);
      _setStyleState(component, key, {
        isHovering: true,
        isActive: _getStyleState(component, key, 'isMouseDown'),
      });
    };

    var existingOnMouseLeave = props.onMouseLeave;
    props.onMouseLeave = (e) => {
      existingOnMouseLeave && existingOnMouseLeave(e);
      _setStyleState(component, key, {isHovering: false, isActive: false});
    };

    var existingOnMouseDown = props.onMouseDown;
    props.onMouseDown = (e) => {
      existingOnMouseDown && existingOnMouseDown(e);
      component._lastMouseDown = Date.now();
      _setStyleState(component, key, {isActive: true, isMouseDown: true});
    };

    var existingOnMouseUp = props.onMouseUp;
    props.onMouseUp = (e) => {
      existingOnMouseUp && existingOnMouseUp(e);
      component._lastMouseUp = Date.now();
      _setStyleState(component, key, {isActive: false, isMouseDown: false});
    };

    if (_getStyleState(component, key, 'isHovering')) {
      Object.assign(newStyle, style[':hover']);
    }

    if (_getStyleState(component, key, 'isActive')) {
      Object.assign(newStyle, style[':active']);
    }
  }

  if (style[':focus']) {
    var existingOnFocus = props.onFocus;
    props.onFocus = (e) => {
      existingOnFocus && existingOnFocus(e);
      _setStyleState(component, key, {isFocused: true});
    };

    var existingOnBlur = props.onBlur;
    props.onBlur = (e) => {
      existingOnBlur && existingOnBlur(e);
      _setStyleState(component, key, {isFocused: false});
    };

    if (_getStyleState(component, key, 'isFocused')) {
      Object.assign(newStyle, style[':focus']);
    }
  }

  if (style[':active'] && components.indexOf(component) === -1) {
    components.push(component);
  }

  props.style = newStyle;

  return renderedElement;
}

function _getStyleState(component: any, key: string, value: string) {
  return component.state &&
    component.state._styleState &&
      component.state._styleState[key] &&
        component.state._styleState[key][value];
}

function _setStyleState(component: any, key: string, newState: Object) {
  var existing = (component.state && component.state._styleState) || {};
  var state = {_styleState: {...existing}};
  state._styleState[key] = state._styleState[key] || {};
  Object.assign(state._styleState[key], newState);
  component.setState(state);
}

function styleSet(...styles: Array<Object|boolean>): any {
  var styleProp = {};

  styles.forEach(style => {
    if (!style || typeof style !== 'object') {
      return;
    }

    var styleObj: Object = style; // flow :(

    Object.keys(styleObj).forEach(name => {
      if (name.indexOf(':') === 0) {
        styleProp[name] = styleProp[name] || {};
        Object.assign(styleProp[name], styleObj[name]);
      } else {
        styleProp[name] = styleObj[name];
      }
    });
  });

  return styleProp;
}

module.exports = {
  resolveStyles,
  styleSet,
};